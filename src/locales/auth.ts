import type { Locale } from '@/lib/i18n'

const l: Locale = {
  ru: {
    'auth.newPassword': 'Новый пароль', 'auth.save': 'Сохранить',
    'auth.needConsent': 'Для регистрации нужно дать согласие на обработку персональных данных.',
    'auth.checkMail': 'Проверьте почту: отправлена ссылка для подтверждения.',
    'auth.enterEmail': 'Введите email, затем нажмите «Забыли пароль?»',
    'auth.resetSent': 'Ссылка для сброса пароля отправлена на почту.',
    'auth.tagline': 'Умная система управления продуктами, сроками годности и питанием',
    'auth.email': 'Email', 'auth.password': 'Пароль',
    'auth.consent1': 'Я даю ', 'auth.consentLink1': 'согласие на обработку персональных данных',
    'auth.consent2': ' (в том числе трансграничную передачу), ознакомлен с ', 'auth.consentLink2': 'Политикой',
    'auth.consent3': ' и принимаю ', 'auth.consentLink3': 'Пользовательское соглашение', 'auth.consent4': '.',
    'auth.signIn': 'Войти', 'auth.signUp': 'Зарегистрироваться', 'auth.forgot': 'Забыли пароль?',
    'auth.toSignUp': 'Нет аккаунта? Регистрация', 'auth.toSignIn': 'Уже есть аккаунт? Войти',
  },
  en: {
    'auth.newPassword': 'New password', 'auth.save': 'Save',
    'auth.needConsent': 'To sign up you need to consent to the processing of your personal data.',
    'auth.checkMail': 'Check your email: we sent you a confirmation link.',
    'auth.enterEmail': 'Enter your email, then tap “Forgot password?”',
    'auth.resetSent': 'A password reset link has been sent to your email.',
    'auth.tagline': 'A smart system for managing food, expiry dates and meals',
    'auth.email': 'Email', 'auth.password': 'Password',
    'auth.consent1': 'I agree to the processing of my personal data and accept the ', 'auth.consentLink1': '',
    'auth.consent2': '', 'auth.consentLink2': 'Privacy Policy',
    'auth.consent3': ' and ', 'auth.consentLink3': 'Terms of Service', 'auth.consent4': '.',
    'auth.signIn': 'Sign in', 'auth.signUp': 'Sign up', 'auth.forgot': 'Forgot password?',
    'auth.toSignUp': 'No account? Sign up', 'auth.toSignIn': 'Already have an account? Sign in',
  },
}
export default l
