import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL as L } from '@/lib/legal'

const H = ({ children }: { children: ReactNode }) => <h2 className="pt-3 text-base font-semibold">{children}</h2>
const Li = ({ children }: { children: ReactNode }) => <li className="ml-5 list-disc">{children}</li>

export function PrivacyEn() {
  return (<>
    <p>Version {L.version}, {L.date}. This notice explains how KINTEXFOODSAVE (the “Service”, {L.site}) processes personal data. It is written to meet the EU GDPR, the UK GDPR and the California CCPA/CPRA, and applies to users outside the Russian Federation.</p>
    <H>1. Controller</H>
    <p>The controller is {L.operator} (the “Operator”). Contact for all privacy matters: {L.email}.</p>
    <H>2. Data we process</H>
    <ul className="space-y-1">
      <Li>Account data: e-mail address and password (stored only as a one-way hash).</Li>
      <Li>Content you enter: product names, quantities, expiry dates, storage places, prices, shopping lists, recipes, notes.</Li>
      <Li>Product photos, if you upload them (compressed on your device before upload).</Li>
      <Li>Settings (for example reminder lead time) and, if you enable notifications, your browser’s push subscription address.</Li>
      <Li>Subscription data if you buy Pro: plan, status and renewal dates. Card details are handled by the payment processor and are never stored by the Operator.</Li>
      <Li>Optional AI settings: the API key you provide (see section 5).</Li>
      <Li>Technical connection data (IP address, browser type) logged automatically by our infrastructure providers.</Li>
    </ul>
    <p>We do not ask for special-category data (health, beliefs, etc.) or biometrics. Receipt photos are recognised in your browser and are not uploaded; only the items you confirm are saved. We do not sell or share personal data for advertising, and we do not profile you.</p>
    <H>3. Purposes and legal bases</H>
    <ul className="space-y-1">
      <Li>Providing the account and features (tracking products and expiry dates, household sharing, subscriptions): performance of a contract (Art. 6(1)(b) GDPR).</Li>
      <Li>Expiry reminders (push notifications) and optional AI features: your consent (Art. 6(1)(a)), which you can withdraw at any time.</Li>
      <Li>Security, abuse prevention and keeping the Service running: legitimate interests (Art. 6(1)(f)).</Li>
      <Li>Tax and accounting records for paid subscriptions: legal obligation (Art. 6(1)(c)).</Li>
    </ul>
    <H>4. Recipients (processors)</H>
    <ul className="space-y-1">
      <Li>Supabase Inc.: database, authentication, photo storage and server functions (hosting region: {L.dbRegionEn}).</Li>
      <Li>Cloudflare, Inc.: hosting and delivery of the website.</Li>
      <Li>Open Food Facts (non-profit project): only a product name or barcode is sent to show a product photo and brand; it is not linked to your account. Images are licensed CC BY-SA.</Li>
      <Li>Browser or OS push services (Google, Apple, Mozilla, etc.): only if you enable notifications.</Li>
      <Li>A third-party payment processor: only if you subscribe to Pro. It acts as an independent controller or processor for payment data.</Li>
      <Li>The AI provider you choose: only if you use AI features (section 5).</Li>
    </ul>
    <H>5. Optional AI features (your own provider and key)</H>
    <p>AI planning is optional and off by default. You choose the AI provider and supply your own API key. The key is stored encrypted in Supabase Vault and is used only to make requests you start. The Operator does not pay for the AI usage and does not see your key in readable form. When you ask the AI to plan with your products, the product names, ingredients and related text of that request are sent to the provider you chose, under that provider’s own terms and privacy policy. Do not include data you do not want to share. You can delete the key at any time in Settings; deleting your account also deletes it. AI output may be inaccurate.</p>
    <H>6. International transfers</H>
    <p>Our providers are located in or may access data from the United States, the United Kingdom and other countries. Where data leaves the EEA or UK, we rely on adequacy decisions or Standard Contractual Clauses (and the UK Addendum) offered by the providers. Data sent to an AI provider you choose is transferred at your request.</p>
    <H>7. Retention</H>
    <p>We keep your data while your account exists. When you delete your account in Settings, your data is deleted immediately and disappears from provider backups within their rotation period. Subscription and invoice records may be kept as long as tax law requires.</p>
    <H>8. Your rights</H>
    <p>Depending on where you live, you have the right to access, rectify and erase your data, restrict or object to processing, data portability, and to withdraw consent at any time (without affecting earlier processing). You can export your data in Settings and delete your account in Settings. Californian residents have the rights to know, delete, correct and to opt out of sale or sharing; we do not sell or share personal information, and we do not discriminate for exercising rights. To use a right, write to {L.email}; we reply within one month (45 days under CCPA). You may also lodge a complaint with your supervisory authority (for example your national data protection authority in the EU, or the ICO in the UK).</p>
    <H>9. Security</H>
    <p>Connections use HTTPS; row-level security ensures each user sees only their own space; passwords are hashed; AI keys are encrypted in Vault; service keys never reach your device. If a breach affects you, we will notify you and authorities as the law requires.</p>
    <H>10. Cookies and local storage</H>
    <p>We use only strictly necessary storage in your browser: your sign-in token, a cache of recent data for offline use, a queue of unsent changes, your language and settings, and the app cache (service worker). There are no analytics, advertising or tracking cookies, so no cookie consent banner for them is needed. You can clear this in browser settings, but you will need to sign in again.</p>
    <H>11. Children</H>
    <p>The Service is not intended for anyone under 16. If you believe a child has given us data, contact us and we will delete it.</p>
    <H>12. Changes and contact</H>
    <p>The current version is always on this page; we will tell you in the Service about material changes. Questions: {L.email}. See also the <Link to="/terms" className="text-brand underline">Terms of Service</Link>.</p>
  </>)
}

export function ConsentEn() {
  return (<>
    <p>Version {L.version}, {L.date}.</p>
    <p>By registering for KINTEXFOODSAVE ({L.site}) I freely agree that {L.operator} (the “Operator”) may process my personal data: my e-mail address, the content I enter (products, expiry dates, prices, shopping lists, recipes, notes, photos), my settings and technical connection data.</p>
    <H>Purposes</H>
    <p>Creating and running my account, providing the Service’s features, reminders if I enable them, subscription handling if I buy Pro, and security.</p>
    <H>Transfers</H>
    <p>I understand that my data is processed by infrastructure providers named in the Privacy Policy (Supabase Inc., Cloudflare, Inc., and others), including outside my country. If I use the optional AI features, I agree that the product names and ingredients in my request are sent to the AI provider I chose, using my own API key.</p>
    <H>Duration and withdrawal</H>
    <p>This consent lasts until I withdraw it or delete my account. I can withdraw it at any time by deleting my account in Settings or by writing to {L.email}. Withdrawal does not affect processing carried out before it.</p>
    <p>More in the <Link to="/privacy" className="text-brand underline">Privacy Policy</Link>. This consent is given separately from the Terms of Service.</p>
  </>)
}

export function TermsEn() {
  return (<>
    <p>Version {L.version}, {L.date}.</p>
    <H>1. The Service</H>
    <p>KINTEXFOODSAVE is a web app for tracking food, expiry dates, shopping lists and recipes. By creating an account you accept these Terms. You must be at least 16.</p>
    <H>2. Free plan and Pro</H>
    <ul className="space-y-1">
      <Li>The core features are free. Optional paid features are offered as the “Pro” subscription.</Li>
      <Li>Pro starts with a 14-day free trial. Unless you cancel before the trial ends, the subscription converts to paid and renews automatically each billing period at the price shown at checkout.</Li>
      <Li>You can cancel at any time; access continues until the end of the paid period. Prices may include or exclude applicable taxes as shown at checkout. Refunds are given where required by law.</Li>
      <Li>Payments are handled by a third-party payment processor; the Operator does not store card data.</Li>
    </ul>
    <H>3. Please note</H>
    <ul className="space-y-1">
      <Li>Shelf-life, calorie and nutrition figures are estimates based on the data you enter and public sources. The Service is informational only and is not medical, dietary or food-safety advice. You decide whether food is safe to eat, based on the packaging and its condition.</Li>
      <Li>Receipt and barcode recognition and AI output may be wrong; check results before relying on them.</Li>
      <Li>The Service is provided “as is” and “as available”, without a guarantee of uninterrupted operation. Please export your data from time to time.</Li>
    </ul>
    <H>4. AI features</H>
    <p>AI features are optional and use a provider and API key that you choose. You are responsible for that provider’s charges and terms. See the <Link to="/privacy" className="text-brand underline">Privacy Policy</Link> for the data sent.</p>
    <H>5. Acceptable use</H>
    <p>Keep your password secret; do not enter other people’s personal data without the right to do so; do not disrupt, probe or overload the Service, reverse-engineer it beyond what the law allows, or use it unlawfully. Household sharing gives invited members access to the shared space; the owner is responsible for whom they invite.</p>
    <H>6. Termination</H>
    <p>You may delete your account at any time. The Operator may suspend or end access if these Terms are breached or if required by law.</p>
    <H>7. Liability</H>
    <p>To the maximum extent permitted by law, the Operator is not liable for indirect or consequential loss, loss of data or profit, or for the consequences of eating any food, and total liability is limited to the amount you paid for the Service in the 12 months before the claim. Nothing limits liability that cannot be limited by law, including your mandatory consumer rights.</p>
    <H>8. Personal data</H>
    <p>See the <Link to="/privacy" className="text-brand underline">Privacy Policy</Link>; consent is given separately.</p>
    <H>9. Changes, law and contact</H>
    <p>We may update these Terms and will notify you of material changes. Governing law: [to be specified by the Operator]; mandatory consumer protections of your country of residence still apply. Contact: {L.operator}, {L.email}.</p>
  </>)
}
