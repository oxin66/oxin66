import type { Metadata } from 'next';
import '../styles/globals.css'; // Import global styles

// Import Farsi fonts here if you choose to use next/font
// Example with IranYekan - ensure you have the font files or use a provider
// import localFont from 'next/font/local'
// const iranYekan = localFont({
//   src: [
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-Thin.woff2', weight: '100', style: 'normal' },
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-Light.woff2', weight: '300', style: 'normal' },
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-Regular.woff2', weight: '400', style: 'normal' },
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-Medium.woff2', weight: '500', style: 'normal' },
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-Bold.woff2', weight: '700', style: 'normal' },
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-ExtraBold.woff2', weight: '800', style: 'normal' },
//     { path: '../../public/fonts/IranYekan/woff2/IRANYekanX-Black.woff2', weight: '900', style: 'normal' },
//   ],
//   variable: '--font-iranyekan', // CSS variable name
//   display: 'swap',
// })
// const shabnam = localFont({
//   src: '../../public/fonts/Shabnam/Shabnam-FD.woff2', // Assuming Shabnam only has one main weight for this example
//   variable: '--font-shabnam',
//   display: 'swap',
// })


export const metadata: Metadata = {
  title: 'دکتر کجاست؟ - پلتفرم نوبت دهی آنلاین پزشکی',
  description: 'پلتفرم جامع نوبت دهی آنلاین پزشکی، جستجوی پزشکان متخصص و دریافت مشاوره آنلاین در ایران.',
  keywords: ['نوبت دهی آنلاین', 'پزشک', 'دکتر', 'متخصص', 'مشاوره پزشکی', 'سلامت'],
  authors: [{ name: 'تیم دکتر کجاست؟' }],
  openGraph: {
    title: 'دکتر کجاست؟ - پلتفرم نوبت دهی آنلاین پزشکی',
    description: 'به راحتی پزشک مورد نظر خود را پیدا کرده و نوبت دریافت کنید.',
    type: 'website',
    locale: 'fa_IR',
    // images: ['/og-image.png'], // Add your OpenGraph image here
  },
  twitter: {
    card: 'summary_large_image',
    title: 'دکتر کجاست؟ - پلتفرم نوبت دهی آنلاین پزشکی',
    description: 'نوبت دهی آنلاین و جستجوی پزشکان متخصص در سراسر ایران.',
    // images: ['/twitter-image.png'], // Add your Twitter image here
  },
};

import { ThemeProvider } from "@/components/theme-provider"; // Assuming you have this
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default async function RootLayout({ // Make it async
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning> {/* Added suppressHydrationWarning for next-themes */}
      {/*
        To use next/font, add the font variable to the body className:
        <body className={`\${iranYekan.variable} \${shabnam.variable} font-sans`}>
        And ensure your tailwind.config.ts uses these CSS variables for fontFamily:
        fontFamily: {
          sans: ['var(--font-iranyekan)', 'var(--font-shabnam)', 'system-ui', ...],
        }
      */}
      <body className="font-sans bg-background text-foreground"> {/* Use 'font-sans' from Tailwind config, added bg/text */}
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <NotificationProvider session={session}>
            {/* You would typically have a main layout structure here */}
            {/* e.g. <Header /> <main className="flex-grow">{children}</main> <Footer /> */}
            {/* For now, just wrapping children directly */}
            <main className="min-h-screen flex flex-col">
                {/* A global header could go here, consuming NotificationContext */}
                <div className="flex-grow">
                    {children}
                </div>
                {/* A global footer could go here */}
            </main>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
