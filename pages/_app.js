import { Inter } from 'next/font/google';
import '../styles/globals.css';

// latin-ext Azərbaycan hərflərini (ə, ğ, ı, İ, ö, ş, ü, ç) əhatə edir.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

// next/font şrifti daxili ad altında yükləyir ('__Inter_xxxx'), CSS-dəki
// 'Inter' adı isə heç vaxt tapılmırdı — başlıqlar, filtr pəncərələri
// (document.body-yə portal edilən) və s. ehtiyat şriftə (Segoe UI/Arial)
// düşürdü, eyni səhifədə iki şrift qarışırdı. İndi --font-sans birbaşa
// yüklənmiş şriftə bağlanır və <html>-ə tətbiq olunur — hər yerdə eyni şrift.
export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-sans: ${inter.style.fontFamily}, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
        }
        html, body, button, input, select, textarea {
          font-family: var(--font-sans);
        }
      `}</style>
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </>
  );
}
