import Link from 'next/link'; // For navigation

export default function HomePage() {
  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <header className="mb-12">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">
          به پلتفرم <span className="text-green-500">دکتر کجاست؟</span> خوش آمدید!
        </h1>
        <p className="text-xl text-gray-700">
          جامع‌ترین سامانه آنلاین برای جستجو، انتخاب و نوبت‌دهی پزشکان متخصص در سراسر ایران.
        </p>
      </header>

      <section className="mb-12">
        <p className="text-lg text-gray-600 mb-8">
          با "دکتر کجاست؟" به راحتی می‌توانید پزشک مورد نظر خود را بر اساس تخصص، موقعیت مکانی و نظرات سایر کاربران پیدا کنید،
          از آخرین وضعیت نوبت‌ها مطلع شوید و به صورت آنلاین نوبت خود را رزرو نمایید.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/login" legacyBehavior>
          <a className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1">
            ورود به حساب کاربری
          </a>
        </Link>
        <Link href="/signup" legacyBehavior>
          <a className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1">
            ثبت نام بیمار جدید
          </a>
        </Link>
        <Link href="/doctors" legacyBehavior>
          <a className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 px-8 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1 md:col-span-2">
            جستجوی پزشکان
          </a>
        </Link>
        {/* Placeholder for doctor registration - will need a separate flow */}
        <button
          disabled
          title="به زودی"
          className="bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg shadow-md md:col-span-2 cursor-not-allowed"
        >
          پزشک هستید؟ ثبت نام کنید (به زودی)
        </button>
      </section>

      <footer className="mt-16 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} دکتر کجاست؟ تمامی حقوق محفوظ است.</p>
      </footer>
    </div>
  );
}
