# Feature 12: журнал действий — append-only индексированная история

> Русский · [English](../../features/12-activity-journal.md)

> **Статус:** Реализовано (этапы 1–4) · **Обновлено:** 2026-10-09
> **Суть:** всякое изменение состояния devst пишется в append-only журнал
> `docs/activity.db` (SQLite, FTS5-индекс): freeze set/unset, task create/close/
> tag/verify, links pin/mirror, integrations install, analyze, session create/close —
> автоматически, из мутаторов CLI; ручные события (`devst log add`) покрывают то,
> чего мутатор не знает — результаты тестов, заметки. Поиск: `devst log query`
> для человека, MCP `get_history` для агента.
> **Ключевые факты:**
> - Журнал — не состояние: реестр редактируем (task rm/set), журнал — никогда, только append.
> - Все мутаторы CLI пишут свои события сами; ручная запись — тоже CLI-команда.
> - Поиск по типу, диапазону дат, файлу и свободному тексту; агент получает те же фильтры по MCP.
> - Журнал защищает от забывчивости, а не от злонамеренного агента.
> **Связанное:** [фича 04](./04-task-registry.md) (реестр, чьи изменения журналятся) ·
> [фича 11](./11-task-tags-and-verification.md) (история верификаций) ·
> [фича 13](./13-ui-only-verification.md) (pending-события верификации) ·
> [фича 03](./03-devst-ui-desktop-window.md) (история freeze в панели) ·
> [ADR-017](../decisions/adr-017-hybrid-storage-md-sqlite.md) (гибридное хранилище и порядок миграций)

## Сценарии

1. **«Кто снял ui-freeze — и что было после?»** — `freeze --unset` пишет событие
   `freeze.unset` {level, files, actor, ts}. Через неделю тесты красные; автор
   добавляет `devst log add tests "ui-e2e red после снятия freeze"` — и один запрос,
   `devst log query --type freeze.unset --after 2026-10-01`, показывает всю цепочку.
2. **«Агент восстанавливает контекст вместо гадания»** —
   `get_history {q: "freeze", file: "ui/src/App.vue"}` возвращает все события по файлу.
3. **«История верификаций»** — таск-верификация пишет `task.verify {id, level, actor}` —
   аудиторский след [фичи 11](./11-task-tags-and-verification.md).
4. **«Окно показывает историю объекта»** — панель верификации читает журнал одобрений задачи.

## Что пишется

- **Автоматически** — все мутаторы CLI: `freeze.set/unset`, `task.create/close/tag/verify`,
  `links.pin/mirror`, `integrations.install`, `analyze` (HEAD + счётчики), `session.create/close`.
- **Вручную** — `devst log add <тип> <текст>` (tests, note): то, чего ни один мутатор не знает.
- **Формат записи:** {id, ts (ISO-8601), actor (git user.name / «author»), type
  (namespace.verb), payload (JSON), refs (пути)}; индексы по ts, type, refs плюс
  FTS5-виртуальная таблица по тексту payload.
- **Граница доверия:** журнал защищает от *забывчивости* (событие не потерять), не от
  злонамеренного агента (доступ к файлу = доступ ко всему; криптография — не-цель).
  Пишут только CLI-мутаторы — и `log add` тоже CLI.

## НЕ-цели

- Не защита от злонамеренного агента — только от забывчивости.
- Не логирование чтений (запросы и показы не пишутся) — только изменения состояния.
- Не ротация/архив в v0 (лимит размера — v1, по потребности).
- Не распределённость: журнал локален, синхронизация между машинами — вне скоупа.

## Версии

### v1 (этапы 1–4, реализованы)

- Ядро: чистый модуль (типы событий, схема, FTS) + тонкая обвязка (БД, append, query);
  журналирование в freeze set/unset и task close/verify.
- Остальные мутаторы (task create/tag, links pin/mirror, integrations install, analyze,
  session) и команды `devst log add` / `devst log query`.
- MCP `get_history`; теги в audit.
- UI: журнал в панели верификации.
