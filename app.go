package main

// R-Mail 0.1 — motore di posta (IMAP per leggere, SMTP per inviare).
// Per ora funziona con Gmail personale + "password per le app".

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	netmail "net/mail"
	"net/smtp"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/charset"
	"github.com/emersion/go-message/mail"
	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/zalando/go-keyring"
)

const (
	imapHost       = "imap.gmail.com"
	imapAddr       = "imap.gmail.com:993"
	smtpHost       = "smtp.gmail.com"
	smtpAddr       = "smtp.gmail.com:465"
	keyringService = "r-mail"
	pollEvery      = 60 * time.Second
)

// Cartelle "speciali" di Gmail: le troviamo per attributo, così funzionano
// anche se l'account Google è in italiano ("[Gmail]/Posta inviata", ecc.).
var folderAttr = map[string]string{
	"starred": `\Flagged`,
	"sent":    `\Sent`,
	"trash":   `\Trash`,
	"spam":    `\Junk`,
	"all":     `\All`,
	"drafts":  `\Drafts`,
}

func init() {
	// Decodifica oggetti e mittenti scritti con set di caratteri non UTF-8.
	imap.CharsetReader = charset.Reader
}

// ---------- Tipi passati all'interfaccia ----------

type Account struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type MailSummary struct {
	UID      uint32 `json:"uid"`
	From     string `json:"from"`
	FromAddr string `json:"fromAddr"`
	Subject  string `json:"subject"`
	Date     string `json:"date"`
	Seen     bool   `json:"seen"`
	Starred  bool   `json:"starred"`
}

type MailFull struct {
	UID         uint32   `json:"uid"`
	From        string   `json:"from"`
	FromAddr    string   `json:"fromAddr"`
	To          string   `json:"to"`
	Subject     string   `json:"subject"`
	Date        string   `json:"date"`
	HTML        string   `json:"html"`
	Text        string   `json:"text"`
	Attachments []string `json:"attachments"`
}

// ---------- App ----------

type App struct {
	ctx context.Context
	mu  sync.Mutex
	acc *Account
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.acc, _ = loadAccount()
	go a.poll()
}

func (a *App) account() *Account {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.acc
}

// ---------- Account ----------

func configPath() (string, error) {
	d, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(d, "r-mail")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "account.json"), nil
}

func loadAccount() (*Account, error) {
	p, err := configPath()
	if err != nil {
		return nil, err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var acc Account
	if err := json.Unmarshal(b, &acc); err != nil || acc.Email == "" {
		return nil, errors.New("account non valido")
	}
	return &acc, nil
}

// GetAccount restituisce l'account salvato (null se non c'è).
func (a *App) GetAccount() *Account { return a.account() }

// Login prova a collegarsi a Gmail e, se va bene, salva l'account.
// La password per le app finisce nel portachiavi del sistema
// (Gestione credenziali su Windows, KWallet su KDE), mai in chiaro su disco.
func (a *App) Login(name, email, appPassword string) error {
	email = strings.TrimSpace(email)
	pass := strings.ReplaceAll(strings.TrimSpace(appPassword), " ", "")
	if email == "" || pass == "" {
		return errors.New("Inserisci email e password per le app")
	}
	c, err := dialIMAP(email, pass)
	if err != nil {
		return friendly(err)
	}
	_ = c.Logout()

	if err := keyring.Set(keyringService, email, pass); err != nil {
		return fmt.Errorf("Impossibile salvare la password nel portachiavi: %v", err)
	}
	acc := &Account{Email: email, Name: strings.TrimSpace(name)}
	p, err := configPath()
	if err != nil {
		return err
	}
	b, _ := json.MarshalIndent(acc, "", "  ")
	if err := os.WriteFile(p, b, 0o600); err != nil {
		return err
	}
	a.mu.Lock()
	a.acc = acc
	a.mu.Unlock()
	return nil
}

// Logout dimentica account e password.
func (a *App) Logout() error {
	if acc := a.account(); acc != nil {
		_ = keyring.Delete(keyringService, acc.Email)
	}
	if p, err := configPath(); err == nil {
		_ = os.Remove(p)
	}
	a.mu.Lock()
	a.acc = nil
	a.mu.Unlock()
	return nil
}

func (a *App) creds() (*Account, string, error) {
	acc := a.account()
	if acc == nil {
		return nil, "", errors.New("Nessun account configurato")
	}
	pass, err := keyring.Get(keyringService, acc.Email)
	if err != nil {
		return nil, "", errors.New("Password non trovata: esci e rientra")
	}
	return acc, pass, nil
}

// ---------- IMAP ----------

func dialIMAP(email, pass string) (*client.Client, error) {
	c, err := client.DialTLS(imapAddr, &tls.Config{ServerName: imapHost})
	if err != nil {
		return nil, err
	}
	c.Timeout = 30 * time.Second
	if err := c.Login(email, pass); err != nil {
		_ = c.Logout()
		return nil, err
	}
	return c, nil
}

func friendly(err error) error {
	s := strings.ToLower(err.Error())
	switch {
	case strings.Contains(s, "invalid credentials"), strings.Contains(s, "authenticationfailed"),
		strings.Contains(s, "username and password not accepted"):
		return errors.New("Email o password per le app non corretti. Ricorda: serve la password per le app di Google, non quella normale")
	case strings.Contains(s, "no such host"), strings.Contains(s, "i/o timeout"), strings.Contains(s, "connection refused"):
		return errors.New("Impossibile raggiungere Gmail: controlla la connessione a internet")
	}
	return err
}

func mailboxFor(c *client.Client, folder string) (string, error) {
	if folder == "" || folder == "inbox" {
		return "INBOX", nil
	}
	want, ok := folderAttr[folder]
	if !ok {
		return "", fmt.Errorf("cartella sconosciuta: %s", folder)
	}
	ch := make(chan *imap.MailboxInfo, 64)
	done := make(chan error, 1)
	go func() { done <- c.List("", "*", ch) }()
	found := ""
	for m := range ch {
		for _, at := range m.Attributes {
			if found == "" && strings.EqualFold(at, want) {
				found = m.Name
			}
		}
	}
	if err := <-done; err != nil {
		return "", err
	}
	if found == "" {
		return "", fmt.Errorf("cartella %q non trovata", folder)
	}
	return found, nil
}

// withMailbox apre la connessione, seleziona la cartella e chiama fn.
func (a *App) withMailbox(folder string, readOnly bool, fn func(c *client.Client, st *imap.MailboxStatus) error) error {
	acc, pass, err := a.creds()
	if err != nil {
		return err
	}
	c, err := dialIMAP(acc.Email, pass)
	if err != nil {
		return friendly(err)
	}
	defer c.Logout()
	mbox, err := mailboxFor(c, folder)
	if err != nil {
		return err
	}
	st, err := c.Select(mbox, readOnly)
	if err != nil {
		return err
	}
	return fn(c, st)
}

func hasFlag(flags []string, f string) bool {
	for _, x := range flags {
		if strings.EqualFold(x, f) {
			return true
		}
	}
	return false
}

func summaryOf(m *imap.Message) MailSummary {
	s := MailSummary{UID: m.Uid, Seen: hasFlag(m.Flags, `\Seen`), Starred: hasFlag(m.Flags, `\Flagged`)}
	date := m.InternalDate
	if env := m.Envelope; env != nil {
		s.Subject = env.Subject
		if !env.Date.IsZero() {
			date = env.Date
		}
		if len(env.From) > 0 {
			f := env.From[0]
			s.FromAddr = f.Address()
			s.From = f.PersonalName
			if s.From == "" {
				s.From = s.FromAddr
			}
		}
	}
	if s.Subject == "" {
		s.Subject = "(nessun oggetto)"
	}
	s.Date = date.Format(time.RFC3339)
	return s
}

// FetchList restituisce le ultime `limit` mail di una cartella, dalla più recente.
func (a *App) FetchList(folder string, limit int) ([]MailSummary, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	out := []MailSummary{}
	err := a.withMailbox(folder, true, func(c *client.Client, st *imap.MailboxStatus) error {
		if st.Messages == 0 {
			return nil
		}
		from := uint32(1)
		if st.Messages > uint32(limit) {
			from = st.Messages - uint32(limit) + 1
		}
		set := new(imap.SeqSet)
		set.AddRange(from, st.Messages)
		items := []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchUid, imap.FetchInternalDate}
		ch := make(chan *imap.Message, limit)
		done := make(chan error, 1)
		go func() { done <- c.Fetch(set, items, ch) }()
		for m := range ch {
			out = append(out, summaryOf(m))
		}
		return <-done
	})
	sort.Slice(out, func(i, j int) bool { return out[i].Date > out[j].Date })
	return out, err
}

// OpenMail scarica una mail completa e la segna come letta.
func (a *App) OpenMail(folder string, uid uint32) (*MailFull, error) {
	var res *MailFull
	err := a.withMailbox(folder, false, func(c *client.Client, _ *imap.MailboxStatus) error {
		set := new(imap.SeqSet)
		set.AddNum(uid)
		section := &imap.BodySectionName{} // BODY[] senza PEEK: Gmail la segna come letta
		ch := make(chan *imap.Message, 1)
		done := make(chan error, 1)
		go func() { done <- c.UidFetch(set, []imap.FetchItem{section.FetchItem()}, ch) }()
		m := <-ch
		for range ch {
		}
		if err := <-done; err != nil {
			return err
		}
		if m == nil {
			return errors.New("Messaggio non trovato")
		}
		body := m.GetBody(section)
		if body == nil {
			return errors.New("Il server non ha inviato il messaggio")
		}
		mr, err := mail.CreateReader(body)
		if err != nil {
			return err
		}
		f := &MailFull{UID: uid, Attachments: []string{}}
		h := mr.Header
		f.Subject, _ = h.Subject()
		if f.Subject == "" {
			f.Subject = "(nessun oggetto)"
		}
		if d, err := h.Date(); err == nil {
			f.Date = d.Format(time.RFC3339)
		}
		if from, err := h.AddressList("From"); err == nil && len(from) > 0 {
			f.FromAddr = from[0].Address
			f.From = from[0].Name
			if f.From == "" {
				f.From = f.FromAddr
			}
		}
		if to, err := h.AddressList("To"); err == nil {
			parts := make([]string, 0, len(to))
			for _, t := range to {
				if t.Name != "" {
					parts = append(parts, t.Name)
				} else {
					parts = append(parts, t.Address)
				}
			}
			f.To = strings.Join(parts, ", ")
		}
		for {
			p, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				break // parte rovinata: mostriamo quello che abbiamo
			}
			switch ph := p.Header.(type) {
			case *mail.InlineHeader:
				ct, _, _ := ph.ContentType()
				b, _ := io.ReadAll(io.LimitReader(p.Body, 5<<20))
				if ct == "text/html" && f.HTML == "" {
					f.HTML = string(b)
				} else if ct == "text/plain" && f.Text == "" {
					f.Text = string(b)
				}
			case *mail.AttachmentHeader:
				name, _ := ph.Filename()
				if name == "" {
					name = "allegato"
				}
				f.Attachments = append(f.Attachments, name)
			}
		}
		res = f
		return nil
	})
	return res, err
}

func (a *App) storeFlag(folder string, uid uint32, flag string, add bool) error {
	return a.withMailbox(folder, false, func(c *client.Client, _ *imap.MailboxStatus) error {
		set := new(imap.SeqSet)
		set.AddNum(uid)
		var op imap.FlagsOp = imap.RemoveFlags
		if add {
			op = imap.AddFlags
		}
		return c.UidStore(set, imap.FormatFlagsOp(op, true), []interface{}{flag}, nil)
	})
}

// SetStarred mette o toglie la stellina.
func (a *App) SetStarred(folder string, uid uint32, on bool) error {
	return a.storeFlag(folder, uid, `\Flagged`, on)
}

// SetSeen segna come letta / da leggere.
func (a *App) SetSeen(folder string, uid uint32, seen bool) error {
	return a.storeFlag(folder, uid, `\Seen`, seen)
}

func (a *App) moveTo(folder string, uid uint32, dest string) error {
	return a.withMailbox(folder, false, func(c *client.Client, _ *imap.MailboxStatus) error {
		target, err := mailboxFor(c, dest)
		if err != nil {
			return err
		}
		set := new(imap.SeqSet)
		set.AddNum(uid)
		return c.UidMove(set, target)
	})
}

// Archive toglie la mail dalla posta in arrivo (resta in "Tutti i messaggi").
func (a *App) Archive(folder string, uid uint32) error { return a.moveTo(folder, uid, "all") }

// Delete sposta nel cestino; se è già nel cestino la elimina per sempre.
func (a *App) Delete(folder string, uid uint32) error {
	if folder != "trash" {
		return a.moveTo(folder, uid, "trash")
	}
	return a.withMailbox(folder, false, func(c *client.Client, _ *imap.MailboxStatus) error {
		set := new(imap.SeqSet)
		set.AddNum(uid)
		if err := c.UidStore(set, imap.FormatFlagsOp(imap.AddFlags, true), []interface{}{imap.DeletedFlag}, nil); err != nil {
			return err
		}
		return c.Expunge(nil)
	})
}

// ---------- SMTP ----------

func splitRecipients(s string) ([]string, error) {
	var out []string
	for _, p := range strings.FieldsFunc(s, func(r rune) bool { return r == ',' || r == ';' }) {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		addr, err := netmail.ParseAddress(p)
		if err != nil {
			return nil, fmt.Errorf("Indirizzo non valido: %s", p)
		}
		out = append(out, addr.Address)
	}
	if len(out) == 0 {
		return nil, errors.New("Inserisci almeno un destinatario")
	}
	return out, nil
}

// Send invia una mail di solo testo. Gmail la salva da solo in "Inviati".
func (a *App) Send(to, subject, body string) error {
	acc, pass, err := a.creds()
	if err != nil {
		return err
	}
	rcpts, err := splitRecipients(to)
	if err != nil {
		return err
	}
	from := (&netmail.Address{Name: acc.Name, Address: acc.Email}).String()
	body = strings.ReplaceAll(strings.ReplaceAll(body, "\r\n", "\n"), "\n", "\r\n")

	var msg strings.Builder
	msg.WriteString("From: " + from + "\r\n")
	msg.WriteString("To: " + strings.Join(rcpts, ", ") + "\r\n")
	msg.WriteString("Subject: " + mime.QEncoding.Encode("utf-8", subject) + "\r\n")
	msg.WriteString("Date: " + time.Now().Format(time.RFC1123Z) + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: 8bit\r\n")
	msg.WriteString("X-Mailer: R-Mail 0.1.1\r\n\r\n")
	msg.WriteString(body + "\r\n")

	conn, err := tls.Dial("tcp", smtpAddr, &tls.Config{ServerName: smtpHost})
	if err != nil {
		return friendly(err)
	}
	c, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return err
	}
	defer c.Close()
	if err := c.Auth(smtp.PlainAuth("", acc.Email, pass, smtpHost)); err != nil {
		return friendly(err)
	}
	if err := c.Mail(acc.Email); err != nil {
		return err
	}
	for _, r := range rcpts {
		if err := c.Rcpt(r); err != nil {
			return fmt.Errorf("Destinatario rifiutato: %s", r)
		}
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write([]byte(msg.String())); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}

// ---------- Controllo nuove mail ----------

func (a *App) inboxStatus() (uidNext, unseen uint32, err error) {
	acc, pass, err := a.creds()
	if err != nil {
		return 0, 0, err
	}
	c, err := dialIMAP(acc.Email, pass)
	if err != nil {
		return 0, 0, err
	}
	defer c.Logout()
	st, err := c.Status("INBOX", []imap.StatusItem{imap.StatusUidNext, imap.StatusUnseen})
	if err != nil {
		return 0, 0, err
	}
	return st.UidNext, st.Unseen, nil
}

func (a *App) newSince(fromUID uint32) []MailSummary {
	out := []MailSummary{}
	_ = a.withMailbox("inbox", true, func(c *client.Client, _ *imap.MailboxStatus) error {
		set := new(imap.SeqSet)
		set.AddRange(fromUID, 0) // fromUID:*
		ch := make(chan *imap.Message, 20)
		done := make(chan error, 1)
		go func() {
			done <- c.UidFetch(set, []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchUid, imap.FetchInternalDate}, ch)
		}()
		for m := range ch {
			if m.Uid >= fromUID {
				out = append(out, summaryOf(m))
			}
		}
		return <-done
	})
	return out
}

func desktopNotify(title, text string) {
	if p, err := exec.LookPath("notify-send"); err == nil {
		_ = exec.Command(p, "-a", "R-Mail", title, text).Start()
		return
	}
	if p, err := exec.LookPath("kdialog"); err == nil {
		_ = exec.Command(p, "--title", title, "--passivepopup", text, "6").Start()
	}
	// Su Windows per ora basta l'avviso dentro l'app.
}

// CheckNow forza un controllo immediato (pulsante "aggiorna").
func (a *App) CheckNow() (uint32, error) {
	_, unseen, err := a.inboxStatus()
	if err == nil {
		wruntime.EventsEmit(a.ctx, "unread", unseen)
	}
	return unseen, err
}

func (a *App) poll() {
	var last uint32
	for {
		if a.account() == nil {
			last = 0
		} else if next, unseen, err := a.inboxStatus(); err == nil {
			wruntime.EventsEmit(a.ctx, "unread", unseen)
			if last != 0 && next > last {
				if news := a.newSince(last); len(news) > 0 {
					wruntime.EventsEmit(a.ctx, "new-mail", news)
					n := news[len(news)-1]
					desktopNotify("Nuova mail da "+n.From, n.Subject)
				}
			}
			last = next
		}
		time.Sleep(pollEvery)
	}
}
