import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <div className="w-full max-w-md px-4">
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "w-full shadow-xl border border-gray-200 rounded-2xl",
              headerTitle: "text-2xl font-bold text-gray-900",
              headerSubtitle: "text-gray-500",
              formButtonPrimary:
                "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all",
              footerActionLink: "text-cyan-600 hover:text-cyan-700",
              socialButtonsBlockButton:
                "border-gray-200 hover:bg-gray-50 transition-all",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-400",
              formFieldInput:
                "border-gray-200 focus:border-cyan-500 focus:ring-cyan-500",
              identityPreviewText: "text-gray-900",
              identityPreviewEditButton: "text-cyan-600 hover:text-cyan-700",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
        />
      </div>
    </div>
  );
}
