# Paynote Store (Windows)

Offline grocery shop and staff desk for one store computer. Sales, stock, product photos and profits stay in a database on that PC. No internet required.

## For the store owner

Download **Paynote-Windows.zip** from Releases (or the file sent to you).

1. Unzip it on the store PC.
2. Double-click `Paynote.exe`.
3. If Windows shows a warning: **More info → Run anyway**.
4. Paynote opens on **this computer**. Store password **1234**. Staff PIN **1234**.

Phones and other computers on the **same Wi‑Fi** open the Wi‑Fi address shown on the password screen (and on Sales / Company), then enter the same password.

Example:

- This computer: `http://127.0.0.1:8080`
- Phones on Wi‑Fi: `http://192.168.x.x:8080`

If a phone cannot open it, allow Paynote on private networks when Windows asks.

The shop book is saved at:

`C:\Users\<name>\AppData\Roaming\Paynote\database`

## What is inside

- Customer shop and staff desk in one window
- Scan QR tickets or sell at the counter
- Buying cost on each product
- Performance: sales, cost of stock sold, profit, stock value
- Local Postgres database (PGlite) on disk
