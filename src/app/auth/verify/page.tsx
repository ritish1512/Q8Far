import { Suspense } from "react";
import VerifyForm from "./VerifyForm";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-agri-bgLight" />}>
      <VerifyForm />
    </Suspense>
  );
}
