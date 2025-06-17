import LoginForm from '@/components/auth/LoginForm'; // Adjust path as needed

export default function LoginPage() {
  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">ورود به حساب کاربری</h1>
        <p className="text-center text-gray-600 mb-8">
          خوشحالیم که دوباره شما را می‌بینیم! لطفا اطلاعات خود را وارد کنید.
        </p>
        <LoginForm />
        <p className="text-center text-sm text-gray-500 mt-6">
          حساب کاربری ندارید؟{' '}
          <a href="/signup" className="text-blue-500 hover:underline font-semibold">
            ثبت نام کنید
          </a>
        </p>
      </div>
    </div>
  );
}
