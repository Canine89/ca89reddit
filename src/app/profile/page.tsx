"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [message, setMessage] = useState("");
  const [myPosts, setMyPosts] = useState<Post[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user.id)
          .single();
        setUsername(profile?.username || "");
        setNewUsername(profile?.username || "");
        // 내가 쓴 글 목록 조회
        const { data: posts } = await supabase
          .from("posts")
          .select("id, title, created_at")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });
        setMyPosts(posts || []);
      }
    });
  }, []);

  const handleUpdate = async () => {
    if (!newUsername) return;
    await supabase.from("profiles").update({ username: newUsername }).eq("id", user.id);
    setUsername(newUsername);
    setMessage("닉네임이 변경되었습니다.");
  };

  if (!user) return <div className="max-w-md mx-auto mt-10">로그인 후 이용 가능합니다.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded bg-white">
      <h1 className="text-2xl font-bold mb-4">내 정보</h1>
      <div className="mb-4">
        <div className="text-gray-500 mb-1">이메일</div>
        <div className="mb-2">{user.email}</div>
        <div className="text-gray-500 mb-1">닉네임</div>
        <input
          type="text"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          className="w-full p-2 border rounded mb-2"
        />
        <button onClick={handleUpdate} className="w-full py-2 bg-blue-500 text-white rounded">닉네임 변경</button>
        {message && <div className="mt-2 text-green-600">{message}</div>}
      </div>
      <div className="mt-8">
        <h2 className="font-semibold mb-2">내가 쓴 글</h2>
        {myPosts.length === 0 ? (
          <div className="text-gray-400">작성한 글이 없습니다.</div>
        ) : (
          <ul className="space-y-2">
            {myPosts.map(post => (
              <li key={post.id}>
                <Link href={`/posts/${post.id}`} className="text-blue-600 hover:underline">
                  {post.title}
                </Link>
                <span className="ml-2 text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 