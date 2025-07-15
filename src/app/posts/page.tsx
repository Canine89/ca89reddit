"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: { username: string };
  comments_count?: number;
  likes_count?: number;
  dislikes_count?: number;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  profiles?: { username: string };
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [showMine, setShowMine] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [myLikes, setMyLikes] = useState<{ [postId: string]: string | null }>({});
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  // 유저 정보 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setUserLoaded(true);
    });
  }, []);

  // 각 글에 대해 내가 누른 좋아요/싫어요 상태 불러오기
  const fetchMyLikes = async (posts: Post[], currentUser: any) => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("likes")
      .select("post_id, type")
      .in("post_id", posts.map(p => p.id))
      .eq("user_id", currentUser.id);
    const likeMap: { [postId: string]: string | null } = {};
    posts.forEach(post => {
      const found = data?.find(l => l.post_id === post.id);
      likeMap[post.id] = found?.type || null;
    });
    setMyLikes(likeMap);
  };

  // 게시글 목록 불러오기 (댓글, 좋아요, 싫어요 count 포함)
  const fetchPosts = async (onlyMine = false, currentUser: any = null) => {
    let query = supabase
      .from("posts")
      .select(`*, profiles(username), comments(count), likes(type)`)
      .order("created_at", { ascending: false });
    if (onlyMine && currentUser) {
      query = query.eq("user_id", currentUser.id);
    }
    const { data, error } = await query;
    if (!error && data) {
      // 댓글, 좋아요/싫어요 count 계산
      const postsWithCounts = data.map((post: any) => ({
        ...post,
        comments_count: post.comments ? post.comments.length : 0,
        likes_count: post.likes ? post.likes.filter((l: any) => l.type === "like").length : 0,
        dislikes_count: post.likes ? post.likes.filter((l: any) => l.type === "dislike").length : 0,
      }));
      setPosts(postsWithCounts);
      if (user) fetchMyLikes(postsWithCounts, user);
    }
  };

  // 각 글의 댓글 불러오기
  const fetchComments = async (postIds: string[]) => {
    if (postIds.length === 0) return;
    const { data } = await supabase
      .from("comments")
      .select("* , profiles(username)")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });
    const map: { [postId: string]: Comment[] } = {};
    postIds.forEach(id => (map[id] = []));
    data?.forEach((c: Comment) => {
      if (map[c.post_id]) map[c.post_id].push(c);
    });
    setComments(map);
  };

  // 글 목록 불러온 후 댓글도 불러오기
  useEffect(() => {
    if (posts.length > 0) {
      fetchComments(posts.map(p => p.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  useEffect(() => {
    if (!userLoaded) return;
    if (user) {
      fetchPosts(showMine, user);
    } else {
      fetchPosts(false, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showMine, userLoaded]);

  // 글쓰기
  const handleCreate = async () => {
    setLoading(true);
    setError("");
    if (!title || !content) {
      setError("제목과 내용을 입력하세요.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("posts").insert({
      title,
      content,
      user_id: user.id,
    });
    if (error) setError(error.message);
    setTitle("");
    setContent("");
    setLoading(false);
    fetchPosts(showMine, user);
  };

  // 글삭제
  const handleDelete = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    fetchPosts(showMine, user);
  };

  // 댓글 작성
  const handleComment = async (postId: string, parentId: string | null = null, value?: string) => {
    if (!user) return;
    const content = value ?? commentInput[postId] ?? "";
    if (!content) return;
    await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content,
      parent_id: parentId ? parentId : null, // null 명시
    });
    setCommentInput(prev => ({ ...prev, [postId]: "" }));
    fetchComments(posts.map(p => p.id));
    fetchPosts(showMine, user);
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    fetchComments(posts.map(p => p.id));
    fetchPosts(showMine, user);
  };

  // 댓글 트리 구조
  function buildCommentTree(list: Comment[]) {
    const map: { [id: string]: Comment & { children: Comment[] } } = {};
    const roots: (Comment & { children: Comment[] })[] = [];
    list.forEach(c => (map[c.id] = { ...c, children: [] }));
    list.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  // 좋아요/싫어요 토글
  const handleLike = async (postId: string, type: "like" | "dislike") => {
    if (!user) return;
    setLikeLoading(postId + type);
    const myType = myLikes[postId];
    if (myType === type) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else if (myType) {
      await supabase.from("likes").update({ type }).eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id, type });
    }
    setLikeLoading(null);
    fetchPosts(showMine, user);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4">
      <div className="flex flex-col items-center mb-4">
        <img src="/logo.png" alt="커뮤니티 로고" className="w-16 h-16 mb-2" style={{borderRadius: '50%', border: '3px solid #FF4500'}} />
        <h1 className="text-2xl font-bold mb-2 text-reddit-orange">커뮤니티 게시판</h1>
      </div>
      {user && (
        <button
          className={`mb-6 px-4 py-1 rounded border font-semibold ${showMine ? "bg-reddit-orange/10 border-reddit-orange text-reddit-orange" : "bg-gray-100 border-gray-300"}`}
          onClick={() => setShowMine(v => !v)}
        >
          {showMine ? "전체 글 보기" : "내가 쓴 글만 보기"}
        </button>
      )}
      {user ? (
        <div className="mb-8 p-4 border rounded bg-white shadow">
          <h2 className="font-semibold mb-2 text-reddit-orange">글쓰기</h2>
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full mb-2 p-2 border rounded border-gray-300 focus:border-reddit-orange focus:ring-1 focus:ring-reddit-orange"
          />
          <textarea
            placeholder="내용"
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full mb-2 p-2 border rounded border-gray-300 focus:border-reddit-orange focus:ring-1 focus:ring-reddit-orange"
            rows={4}
          />
          {error && <div className="mb-2 text-red-500">{error}</div>}
          <button
            onClick={handleCreate}
            className="w-full py-2 bg-orange-500 text-white rounded font-bold outline outline-2 outline-orange-500/30 hover:bg-orange-600 transition disabled:opacity-50"
            disabled={loading}
          >
            글쓰기
          </button>
        </div>
      ) : (
        <div className="mb-8 text-gray-500">글쓰기는 로그인 후 이용 가능합니다.</div>
      )}
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="p-4 border rounded bg-white shadow-sm">
            <div className="mb-2">
              <div className="font-semibold text-lg">{post.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-reddit-orange font-semibold">{post.profiles?.username || "익명"}</span>
                <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</span>
                {user && user.id === post.user_id && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-xs text-reddit-orange hover:underline font-semibold ml-2"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mb-1 items-center">
              <span className="flex items-center gap-1"><span className="text-lg">💬</span> {post.comments_count ?? 0}</span>
              <button
                className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${myLikes[post.id] === "like" ? "bg-reddit-orange/20 text-reddit-orange" : "bg-gray-100 text-gray-700"}`}
                disabled={!user || likeLoading === post.id + "like"}
                onClick={() => handleLike(post.id, "like")}
              >👍 {post.likes_count ?? 0}</button>
              <button
                className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${myLikes[post.id] === "dislike" ? "bg-red-200 text-red-600" : "bg-gray-100 text-gray-700"}`}
                disabled={!user || likeLoading === post.id + "dislike"}
                onClick={() => handleLike(post.id, "dislike")}
              >👎 {post.dislikes_count ?? 0}</button>
            </div>
            <div className="text-gray-700 whitespace-pre-line mb-1">{post.content}</div>
            <div className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</div>
            {/* 댓글/대댓글 */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-reddit-orange text-sm">댓글</h4>
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={commentInput[post.id] || ""}
                  onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                  className="flex-1 p-2 border rounded border-gray-300 focus:border-reddit-orange focus:ring-1 focus:ring-reddit-orange"
                  placeholder="댓글을 입력하세요"
                  disabled={!user}
                />
                <button
                  onClick={() => handleComment(post.id, null)}
                  className={`px-3 rounded font-semibold transition
                    ${user ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"}
                  `}
                  disabled={!user}
                >
                  등록
                </button>
              </div>
              <div className="space-y-2">
                {buildCommentTree(comments[post.id] || []).map(c => (
                  <CommentNode
                    key={c.id}
                    comment={c}
                    depth={0}
                    postId={post.id}
                    onReply={handleComment}
                    onDelete={handleDeleteComment}
                    user={user}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 댓글 트리 노드 컴포넌트
function CommentNode({ comment, depth, postId, onReply, onDelete, user }: {
  comment: Comment & { children?: Comment[] };
  depth: number;
  postId: string;
  onReply: (postId: string, parentId: string, value: string) => void;
  onDelete: (commentId: string) => void;
  user: any;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyValue, setReplyValue] = useState("");

  return (
    <div style={{ marginLeft: depth * 24 }} className="p-2 border rounded bg-gray-50 flex flex-col mb-2">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-gray-800">{comment.content}</div>
          <div className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</div>
          <div className="text-xs text-gray-500">{comment.profiles?.username || "익명"}</div>
        </div>
        {user && user.id === comment.user_id && (
          <button onClick={() => onDelete(comment.id)} className="text-xs text-red-500">삭제</button>
        )}
      </div>
      <div className="flex gap-2 mt-1">
        {user && (
          <button onClick={() => setShowReply(v => !v)} className="text-xs text-blue-500">답글</button>
        )}
      </div>
      {showReply && (
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={replyValue}
            onChange={e => setReplyValue(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="답글을 입력하세요"
          />
          <button
            onClick={() => { onReply(postId, comment.id, replyValue); setReplyValue(""); setShowReply(false); }}
            className="px-2 bg-blue-500 text-white rounded"
          >등록</button>
        </div>
      )}
      {comment.children && comment.children.map(child => (
        <CommentNode
          key={child.id}
          comment={child}
          depth={depth + 1}
          postId={postId}
          onReply={onReply}
          onDelete={onDelete}
          user={user}
        />
      ))}
    </div>
  );
} 