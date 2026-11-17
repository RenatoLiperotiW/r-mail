# R-Mail 0.1

La posta di **mio-os**: un client Gmail leggero, arrotondato, con tema chiaro e scuro automatico.
Fatto con **Go** (motore IMAP/SMTP) + **Wails** (interfaccia in HTML/CSS/JS, senza Node).

## Cosa fa la 0.1
- Accesso a Gmail con **password per le app** (salvata nel portachiavi del sistema, mai in chiaro)
- Posta in arrivo, Speciali, Inviati, Spam, Cestino
- Lettura delle mail (HTML in un riquadro isolato, senza script; i link si aprono nel browser)
- Scrivi, rispondi, invia (Ctrl+Invio)
- Stellina, archivia, elimina, segna come letta / da leggere
- Ricerca tra i messaggi caricati
- Controllo nuove mail ogni 60 secondi con avviso e contatore "da leggere"

## Primo avvio su Windows

1. Installa Go (una volta sola), poi **chiudi e riapri PowerShell**:
   ```powershell
   winget install --id GoLang.Go -e
   ```
2. Installa Wails (una volta sola), poi **chiudi e riapri PowerShell**:
   ```powershell
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   wails doctor
   ```
3. Compila R-Mail (dalla cartella del progetto):
   ```powershell
   go mod tidy
   wails build
   .\build\bin\R-Mail.exe
   ```
   Per sviluppare con ricarica automatica: `wails dev`

## Password per le app di Google
1. Serve la **verifica in due passaggi** attiva sull'account Google.
2. Vai su https://myaccount.google.com/apppasswords
3. Nome app: `R-Mail` → **Crea** → copia le 16 lettere e incollale in R-Mail.

## Prossime versioni
- 0.2: allegati scaricabili, mail salvate sul PC (apertura istantanea), ricerca sul server, cartelle/etichette
- 0.3: più account, "Accedi con Google", Outlook
- 0.4: calendario e scadenze
- Pacchetto Nix per mio-os (interruttore `mioOS.mailCalendario`)
