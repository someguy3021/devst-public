# Обзор архитектуры

> Русский · [English](../../architecture/overview.md)
>
> Часть публичной документации devst. Английская версия — источник истины; эта
> страница — её русская редакция.

## Версия одним абзацем

devst — это TypeScript-CLI с **чистым ядром и нулём runtime-зависимостей** (только
stdlib Node). Всё, что касается внешнего мира, — файловая система, git, SQLite,
дочерние процессы — живёт в тонких обвязках. Тот же чистый код ядра исполняется
в webview настольного приложения на Tauri v2 и внутри Playwright-раннера.
Дистрибуция — одиночный самодостаточный бинарь (Node SEA), несущий шаблоны
интеграций как зашитые ассеты; настольное приложение поставляет этот бинарь
сайдкаром.

## Слои

```
┌────────────────────────────────────────────────────────────────┐
│  DESKTOP UI (Tauri v2): Vue 3 + Quasar in the webview —        │
│  executes the same pure core; FS/dialogs via plugins behind    │
│  a KernelAdapter; task mutations go through a Rust sidecar     │
│  (rusqlite + IPC), not a second implementation                 │
├────────────────────────────────────────────────────────────────┤
│  DELIVERY (outside the core): canonical templates — agent      │
│  skill, slash-commands, hooks, scaffolding, staging overlay    │
├────────────────────────────────────────────────────────────────┤
│  SHELLS (FS / processes / git / node:sqlite):                  │
│  cli · mcp-run · registry-run · activity-run · integrate-run   │
│  bugs-run · links-run · visual-run · collect-run               │
├────────────────────────────────────────────────────────────────┤
│  PURE CORE (strings & lists, no node:* imports):               │
│  util · head · sessions · env · undoc · freeze · scan-ui ·     │
│  req · check · map · status · brief · visual · specgen ·       │
│  png · bugs-core · integrations · links · features ·           │
│  dirty · remind · registry · sea · activity · code-intel       │
└────────────────────────────────────────────────────────────────┘
```

Единственное архитектурное правило, на котором всё это держится: **модули ядра —
чистые функции над строками и списками и никогда не импортируют `node:*`**. Именно
это позволяет одному и тому же коду работать в CLI, в webview и в тестах — и держит
`tsc --strict` зелёным при нуле runtime-зависимостей.

## Хранение: проза в markdown, реестры в SQLite

Осознанный гибрид: человеческая проза (архитектура, фичи, ADR, журналы сессий)
остаётся в **markdown** — ревьюится в pull request'ах, грепается, диффается.
Структурированные реестры (задачи, вердикты заморозки верстки) живут в **SQLite**
(`docs/registry.db`) через `node:sqlite`, в режиме WAL с чекпоинтом при записи, так
что сам файл `.db` коммитится чисто. Мостовые команды переносят строки реестра
заморозки между markdown и базой — каждый формат остаётся источником истины для
своего вида данных.

Картину дополняют ещё два хранилища. **Журнал действий** (`docs/activity.db`) —
append-only база SQLite с FTS5-индексом: каждое изменение состояния (freeze
set/unset, task create/close/tag/verify, пины, установки, analyze, сессии)
записывается автоматически мутаторами CLI, плюс ручные события через
`devst log add`. Журнал — история, а не состояние: реестр редактируется, журнал —
никогда. **Код-индекс** (`.devst/graph.db`) — производный одноразовый кеш,
собираемый `devst analyze`: живёт вне `docs/`, пересобирается в любой момент и
канона не содержит.

## Модули ядра, коротко

| Модуль | Ответственность |
|---|---|
| `head.ts` | Разбирает стандартную шапку дока (статус/дата/суть/ключевые факты) |
| `check.ts` | Линт конвенций: шапки, карта, панель, свежесть окружения, версии |
| `map.ts` / `status.ts` / `brief.ts` | Карта доков / панель «Сейчас» / сводка одним текстом |
| `env.ts` | Разведка окружения по манифестам стеков (package.json, Cargo.toml, pyproject, Makefile, compose, CI) + проверка свежести для CI |
| `undoc.ts` / `dirty.ts` | Детекторы: коммиты кода без записи в журнал; незакоммиченная работа |
| `registry.ts` | Ядро реестра задач: схема, типы, статусы, таймеры, связи, гейт-отчёт закрытия |
| `freeze.ts` / `scan-ui.ts` | Реестр заморозки верстки: замороженные области, режим default-deny, сопоставление блоков SFC ∩ дифф-ханков; автодрафт из исходников |
| `visual.ts` / `specgen.ts` / `png.ts` | Визуальная заморозка: layout-снимок + хэш экрана; генерация Playwright-спеки из реестра заморозки; PNG-декодер без зависимостей + пиксельный диф |
| `bugs-core.ts` | Bug Hunt: форматы репортов, URL → экран → файлы, адресные карточки BUG-* |
| `integrations.ts` | Таргет-спеки, подстановка токенов, мерж конфигов, хэш-сверка для `integrations install` / `doctor` |
| `remind.ts` | Конвейер напоминаний: одна модель `Reminder` над провайдерами-детекторами |
| `links.ts` / `links-run.ts` | Связанные репы: манифест `links.json`, перекрёстные ссылки `id://`, пины sha256+HEAD, зеркала байт-в-байт |
| `features.ts` / `capabilities.ts` | Фичи-гейты (`features.*` в devst.json): on/off/auto, детект соседей-инструментов для рекомендаций `env`/`doctor` |
| `activity.ts` | Ядро append-only журнала: схема событий, модель поиска FTS5 |
| `code-intel/` | Код-интеллект: каскада парсеров (свой сканер → вшитые парсеры TypeScript/Lezer/PHP/Lua/Elixir), граф импортов, blast-radius, git-аналитика, health-детекторы, символы, отчёт пересмотра `audit` |
| `mcp.ts` | Ядро MCP-сервера: 23 read-only инструмента над каноном, реестром и код-интеллектом; конверты `_meta` (свежесть, полнота, усечения) |
| `scaffold.ts` | Заготовки с правдивой нумерацией для `new adr/session/feature/research/...`, генераторы `init` |

Обвязки: `cli.ts` (аргументы, ФС, вывод, коды выхода), `mcp-run.ts` (процесс stdio
JSON-RPC-сервера), `registry-run.ts` (SQLite WAL, git-хелперы), `activity-run.ts`
(база журнала), `collect-run.ts` (сборщики фактов, общие для CLI и MCP — один
источник, без дублирования), `integrate-run.ts` (живая установка + smoke-прогон
doctor), `bugs-run.ts` (сборка/обфускация артефакта, ingest), `links-run.ts`
(пины/зеркала/проверки связей на живой ФС), `visual-run.ts` (оркестрация
Playwright) плюс раннеры код-интеллекта (`analyze-run.ts`, `health-run.ts`,
`risk-run.ts`, `symbols-run.ts`… поверх `graph.db`).

## Конвейер команд

`init` (скаффолд тира) → `new` (нумерованные стабы) → рабочий цикл: `env`
(разведка / штамп свежести) → `check` (линт, exit 1 для CI) → `map` / `status`
(регенерация) → `hook install` (pre-commit в целевой репе). От них ответвляются
профильные контуры: заморозка верстки — `freeze --scan/--file/--staged` + `visual`;
стейджинг — `bugs emit/ingest`; связанные репы — `links check/pin/mirror`; обвязка
харнесса — `integrations install` + `doctor`; задачи — `task new/show/start/close` +
`board` + `file`; код-интеллект — `analyze` + `blast`; журнал — `log add/query`;
честный учёт — `audit`; агентный доступ — `mcp`.

## Дистрибуция: один бинарь + сайдкар

CLI компилируется в **одиночный бинарь Node SEA** (~98 МБ, Windows-first):
канонические шаблоны интеграций зашиты как ассеты, поэтому `integrations install`
работает прямо из exe без чекаута репозитория, а хуки диспетчеризуются прямо в exe
без вызова Node. Парсеры кода для слоя интеллекта зашиты так же — каждый со своей
версией и лицензией в генерируемом манифесте. Настольное приложение Tauri
поставляет тот же exe как **сайдкар**: мутации задач с гейтами закрытия из UI идут
через процесс CLI — одна реализация правил, а не две.

## Тестирование

- **Юнит-тесты чистого ядра** — основная масса ~500 тестов; на входе строки,
  на выходе строки.
- **Браузерный E2E** — настоящий Chromium (Playwright) против vite-сборки UI
  с адаптером `MockKernel` вместо Tauri IPC; покрыт каждый экран.
- **Визуальная регрессия** — по умолчанию layout-снимки + хэши экранов; настоящий
  пиксельный диф (собственный PNG-декодер, `node:zlib`) — в опциональном
  пиксель-перфект режиме.

## Избранные решения

- **[ADR-001](../decisions/adr-001-ts-repo-instead-of-script.md)** — TypeScript-репозиторий с чистым ядром вместо однофайлового скрипта
- **[ADR-015](../decisions/adr-015-tauri-ui-stack.md)** — Tauri v2 + Vite + Quasar, ядро исполняется в webview
- **[ADR-016](../decisions/adr-016-ui-e2e-mockkernel-playwright.md)** — браузерный E2E на Playwright с MockKernel вместо tauri-driver
- **[ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md)** — гибридное хранение: проза в markdown + реестры в SQLite
- **[ADR-018](../decisions/adr-018-sea-binary-distribution.md)** — дистрибуция как бинарь Node SEA с зашитым каноном
- **[ADR-019](../decisions/adr-019-machine-independent-canon-tokens.md)** — машинонезависимый канон: path-токены, подставляемые при установке
- **[ADR-020](../decisions/adr-020-tauri-sidecar.md)** — SEA-бинарь как сайдкар приложения Tauri
- **[ADR-021](../decisions/adr-021-reminder-pipeline.md)** — напоминания как один конвейер над провайдерами-детекторами
- **[ADR-022](../decisions/adr-022-parallel-agents-staging-join.md)** — параллельные агенты: журналы задач стейджинга + идемпотентный join
- **[ADR-025](../decisions/adr-025-linked-repos-links-json.md)** — связанные репы: ссылки `id://`, пины, зеркала
- **[ADR-028](../decisions/adr-028-parser-cascade-t0-t1-t2.md)** — каскада парсеров код-интеллекта (T0/T1/T2) и вшитые ассеты

Все 28 решений опубликованы в [docs/ru/decisions/](../decisions/).
