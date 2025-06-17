import SignupForm from '@/components/auth/SignupForm'; // Adjust path as needed

export default function SignupPage() {
  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-green-600 mb-2">ایجاد حساب کاربری جدید</h1>
        <p className="text-center text-gray-600 mb-8">
          به خانواده بزرگ "دکتر کجاست؟" بپیوندید. ثبت نام سریع و آسان است.
        </p>
        <SignupForm />
        <p className="text-center text-sm text-gray-500 mt-6">
          قبلاً ثبت نام کرده‌اید؟{' '}
          <a href="/login" className="text-green-500 hover:underline font-semibold">
            وارد شوید
          </a>
        </p>
      </div>
    </div>
  );
}
