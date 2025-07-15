import WithNavbarLayout from "../(with-navbar)/layout";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <WithNavbarLayout>{children}</WithNavbarLayout>;
} 