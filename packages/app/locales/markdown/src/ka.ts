import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Georgian. */
export const ka: MarkdownTranslations = {
  'markdown.components.invalid':
    'components შეიცავს ჩანაწერს, რომელიც არ არის React კომპონენტი ან ელემენტის სახელი.',
  'markdown.components.unsupported':
    'marked პროვაიდერი ვერ გამოიყენებს components-ს, რადგან აბრუნებს HTML სტრიქონს. ატრიბუტების დასამატებლად გამოიყენეთ elementAttributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" არ არის ატრიბუტის სახელი (<{{element}}>-ზე)',
  'markdown.elementAttributes.refused':
    'elementAttributes ვერ დააყენებს "{{name}}"-ს <{{element}}>-ზე: მას რენდერერი ფლობს',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes ასახელებს <{{element}}>-ს, რომელსაც markdown არ ქმნის',
  'markdown.footnotes.backToReference': 'დაბრუნება {{reference}} მითითებაზე',
  'markdown.footnotes.label': 'სქოლიოები',
}
