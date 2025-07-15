import WithNavbarLayout from "../(with-navbar)/layout";

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return <WithNavbarLayout>{children}</WithNavbarLayout>;
} 