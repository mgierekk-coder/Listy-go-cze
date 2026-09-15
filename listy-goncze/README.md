# Listy gończe (listy-goncze) — v1.0.0

Foundry VTT v13, moduł niezależny (nie wymaga konkretnego systemu, ale rzut na
Investigation zakłada system D&D5e — `actor.rollSkill("inv")`).

## Instalacja
Skopiuj cały folder `listy-goncze` do `Data/modules/` w Foundry (lub Forge),
włącz w świecie. Przycisk "Listy gończe" pojawi się na dole katalogu Journal.

## Co jest zrobione (v1.0.0)
- Okno startowe: lista regionów + tworzenie nowego regionu (GM)
- Widok regionu: zakładki Aktywni / Schwytani, lista poszukiwanych z widocznym
  postępem śledztwa i auto-liczonym złotem
- Karta poszukiwanego: zakładka Informacje (edytowalna przez GM) i Śledztwo
  (pasek postępu + lista tropów posortowana wg głębokości, guzik rzutu na
  Investigation dla odblokowanych tropów)
- Drzewo tropów: węzły mogą mieć wielu rodziców, logika AND/OR ustawiana per
  węzeł w edytorze GM, rodzice mogą wskazywać na trop u INNEGO poszukiwanego
  (cross-target trigger)
- Nagroda: złoto liczone automatycznie z ukończonych węzłów wg wzoru
  `5 × DC − 25`, guzik "Odbierz złoto" dolicza kwotę do `system.currency.gp`
  aktora, który ukończył ostatni trop; przedmioty GM przeciąga z katalogu/
  kompendium na okno nagrody, gracze przeciągają je stamtąd na swoją kartę
- Zapisy od graczy (rzut, dodanie przedmiotu, odbiór złota) idą przez
  `game.socket` do klienta GM, bo world setting może zapisać tylko GM

## Świadome uproszczenia v1 — do dopracowania w kolejnych iteracjach
- **Układ kanwy edytora**: obecny edytor drzewa to płaska, sortowana lista
  (korzenie na górze), NIE graficzna kanwa z liniami łączącymi jak w mockupie.
  Ustaliliście automatyczny układ warstwowy bez zapisywania pozycji x/y —
  lista realizuje to funkcjonalnie, ale bez wizualnych połączeń między
  węzłami. Jeśli zależy Wam na rysowanych liniach, to następny krok (SVG
  overlay licząc pozycje z głębokości).
- **"Otwórz nagrodę" widoczne dla wszystkich**: uprościłem — okno nagrody
  otwiera każdy (gracz też), nie tylko GM. Przeciąganie NOWYCH przedmiotów do
  puli nadal tylko GM. Jeśli wolisz, żeby okno było całkiem niedostępne dla
  graczy przed decyzją GM, trzeba dodać osobny stan "otwarte/zamknięte" na
  poszukiwanym.
- **Region w karcie Informacje** pokazuje na razie surowe ID regionu zamiast
  nazwy — kosmetyczna poprawka do zrobienia.
- Brak potwierdzenia/dialogu przy usuwaniu tropu — usuwa się od razu.
- Rzut na Investigation zakłada dnd5e; przy innym systemie trzeba podmienić
  `actor.rollSkill("inv", ...)` w `wanted-card.mjs`.
