import type { Language } from './index'

export interface Release {
  /** Semver, matches `package.json` for the newest entry. */
  version: string
  /** 'YYYY-MM-DD' */
  date: string
  /** User-facing changes, plain language, 1–5 per release. */
  notes: Record<Language, readonly string[]>
}

/** The in-app "What's new", newest first. Keep in step with CHANGELOG.md (English). */
export const CHANGELOG: readonly Release[] = [
  {
    version: '1.5.0',
    date: '2026-10-09',
    notes: {
      en: [
        'Pay after the fact: a new payment can start at a session you already attended. The oldest unpaid one is offered first.',
        'Attended but unpaid sessions now look different in the calendar — a grey outline. Tap one to pay for it. A cancelled session with nothing paid for it is crossed out and can be paid too.',
      ],
      uk: [
        'Оплата після занять: нова оплата може починатися з уже відвіданого заняття. Першим пропонується найдавніше неоплачене.',
        'Відвідані, але неоплачені заняття тепер виглядають у календарі інакше — сіра рамка. Натисніть на таке, щоб оплатити. Скасоване заняття, за яке не заплачено, закреслене — його теж можна оплатити.',
      ],
      ru: [
        'Оплата после занятий: новая оплата может начинаться с уже посещённого занятия. Первым предлагается самое давнее неоплаченное.',
        'Посещённые, но неоплаченные занятия теперь выглядят в календаре иначе — серая рамка. Нажмите на такое, чтобы оплатить. Отменённое занятие, за которое не заплачено, зачёркнуто — его тоже можно оплатить.',
      ],
    },
  },
  {
    version: '1.4.0',
    date: '2026-09-29',
    notes: {
      en: [
        'Correct payment right from a paid session — e.g. when too many sessions were recorded.',
        'A new payment suggests the amount: last price per session × sessions. You can change it.',
      ],
      uk: [
        'Виправити оплату можна прямо з оплаченого заняття — наприклад, якщо записали забагато занять.',
        'Нова оплата сама рахує суму: минула ціна за заняття × кількість. Її можна змінити.',
      ],
      ru: [
        'Исправить оплату можно прямо из оплаченного занятия — например, если записали слишком много занятий.',
        'Новая оплата сама считает сумму: прошлая цена за занятие × количество. Её можно изменить.',
      ],
    },
  },
  {
    version: '1.3.1',
    date: '2026-09-26',
    notes: {
      en: [
        'The Settings button is a circle like “+” next to it.',
        'Session length is picked with the phone’s own picker, like the currency — the form no longer stretches.',
      ],
      uk: [
        'Кнопка налаштувань — такий самий кружок, як «+» поруч.',
        'Тривалість заняття обирається системним списком телефона, як валюта, — форма більше не розтягується.',
      ],
      ru: [
        'Кнопка настроек — такой же кружок, как «+» рядом.',
        'Длительность занятия выбирается системным списком телефона, как валюта, — форма больше не растягивается.',
      ],
    },
  },
  {
    version: '1.3.0',
    date: '2026-09-26',
    notes: {
      en: [
        'Choose which session a new payment starts from.',
        'Pay for a single session right from its card.',
        'Session length presets open as a list.',
        'This “What’s new” page, and a note after each update.',
        'Guests see whose sessions these are: your name is in the calendar name and the event.',
      ],
      uk: [
        'Можна вибрати, з якого заняття починається нова оплата.',
        'Оплата одного заняття прямо з його картки.',
        'Тривалість заняття обирається зі списку.',
        'Сторінка «Що нового» і повідомлення після кожного оновлення.',
        'Гості бачать, чиї це заняття: ваше імʼя — у назві календаря і в події.',
      ],
      ru: [
        'Можно выбрать, с какого занятия начинается новая оплата.',
        'Оплата одного занятия прямо из его карточки.',
        'Длительность занятия выбирается из списка.',
        'Страница «Что нового» и сообщение после каждого обновления.',
        'Гости видят, чьи это занятия: ваше имя — в названии календаря и в событии.',
      ],
    },
  },
  {
    version: '1.2.1',
    date: '2026-09-26',
    notes: {
      en: ['Privacy policy — linked in About.'],
      uk: ['Політика конфіденційності — посилання в «Про застосунок».'],
      ru: ['Политика конфиденциальности — ссылка в «О приложении».'],
    },
  },
  {
    version: '1.2.0',
    date: '2026-09-26',
    notes: {
      en: [
        'Recorded payments can be corrected or deleted.',
        'Cancelling a paid session asks whether to carry the payment over.',
        'In Google Calendar, a session cancelled without carrying the payment over is crossed out in grey.',
        'Delete data: everything, or only from Google.',
      ],
      uk: [
        'Записані оплати можна виправити або видалити.',
        'Під час скасування оплаченого заняття застосунок питає, чи переносити оплату.',
        'У Google Календарі заняття, скасоване без перенесення оплати, закреслене і сіре.',
        'Видалення даних: усе або лише з Google.',
      ],
      ru: [
        'Записанные оплаты можно исправить или удалить.',
        'При отмене оплаченного занятия приложение спрашивает, переносить ли оплату.',
        'В Google Календаре занятие, отменённое без переноса оплаты, зачёркнуто и серое.',
        'Удаление данных: всё или только из Google.',
      ],
    },
  },
  {
    version: '1.1.0',
    date: '2026-09-26',
    notes: {
      en: [
        'Your data stays on the phone; Google Calendar and Drive are optional for each hobby.',
        'Add guests so the sessions show up in their calendars too.',
        'Choose the color of paid sessions in Google Calendar.',
        'The idea’s author and the developers are credited in About.',
      ],
      uk: [
        'Дані зберігаються на телефоні; Google Календар і Диск — за бажанням для кожного хобі.',
        'Додайте гостей, щоб заняття зʼявлялися і в їхніх календарях.',
        'Вибір кольору оплачених занять у Google Календарі.',
        'Авторка ідеї та розробники — у «Про застосунок».',
      ],
      ru: [
        'Данные хранятся на телефоне; Google Календарь и Диск — по желанию для каждого хобби.',
        'Добавьте гостей, чтобы занятия появлялись и в их календарях.',
        'Выбор цвета оплаченных занятий в Google Календаре.',
        'Автор идеи и разработчики — в «О приложении».',
      ],
    },
  },
  {
    version: '1.0.1',
    date: '2026-09-26',
    notes: {
      en: [
        'Deleting a hobby removes all its sessions from Google Calendar, no manual sync needed.',
        'A message confirms the deletion.',
        'A failed sync retries by itself.',
      ],
      uk: [
        'Видалення хобі прибирає всі його заняття з Google Календаря без ручної синхронізації.',
        'Повідомлення підтверджує видалення.',
        'Невдала синхронізація повторюється сама.',
      ],
      ru: [
        'Удаление хобби убирает все его занятия из Google Календаря без ручной синхронизации.',
        'Сообщение подтверждает удаление.',
        'Неудачная синхронизация повторяется сама.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-09-26',
    notes: {
      en: [
        'First release: hobbies with passes, a calendar of sessions, payments.',
        'After a session the app asks whether you went.',
        'Sync with Google Calendar and backup to Google Drive.',
        'Installs to the Home Screen and works offline.',
      ],
      uk: [
        'Перший випуск: хобі з абонементами, календар занять, оплати.',
        'Після заняття застосунок питає, чи ви були.',
        'Синхронізація з Google Календарем і резервна копія на Google Диску.',
        'Встановлюється на головний екран і працює без інтернету.',
      ],
      ru: [
        'Первый выпуск: хобби с абонементами, календарь занятий, оплаты.',
        'После занятия приложение спрашивает, были ли вы.',
        'Синхронизация с Google Календарём и резервная копия на Google Диске.',
        'Устанавливается на главный экран и работает без интернета.',
      ],
    },
  },
]
