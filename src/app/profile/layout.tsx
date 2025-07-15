import WithNavbarLayout from "../(with-navbar)/layout";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <WithNavbarLayout>{children}</WithNavbarLayout>;
} 