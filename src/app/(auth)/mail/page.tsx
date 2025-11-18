import FloatingControls from "./floating-controls"
import MailPage from "@/app/mail/index"

export default function Home() {
  return (
    <>
      <FloatingControls />

      {/* Main Mail Page */}
      <div className="h-screen w-full">
        <MailPage />
      </div>
    </>
  )
}
