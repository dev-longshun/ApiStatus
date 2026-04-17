import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Admin - 渠道管理",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}
