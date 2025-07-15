import "./globals.css";

export const metadata = {
  title: "ca89reddit",
  description: "Reddit 스타일 커뮤니티 게시판 - ca89reddit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
