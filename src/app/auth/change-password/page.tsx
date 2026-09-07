import { Suspense } from "react";
import ChangePasswordForm from "./ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-agri-bgLight" />}>
      <ChangePasswordForm />
    </Suspense>
  );
}
