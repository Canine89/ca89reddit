"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: { username: string };
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

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [myLike, setMyLike] = useState<string | null>(null); // 'like', 'dislike', null
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // 게시글 정보
  useEffect(() => {
    supabase
      .from("posts")
      .select("*, profiles(username)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setPost(data);
        setEditTitle(data?.title || "");
        setEditContent(data?.content || "");
      });
  }, [id]);

  // 유저 정보
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // 댓글 목록
  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(username)")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };
  useEffect(() => {
    fetchComments();
  }, [id]);

  // 좋아요/싫어요 카운트 및 내 상태
  const fetchLikes = async () => {
    const { data } = await supabase
      .from("likes")
      .select("user_id, type")
      .eq("post_id", id);
    setLikeCount(data?.filter((l: any) => l.type === "like").length || 0);
    setDislikeCount(data?.filter((l: any) => l.type === "dislike").length || 0);
    if (user) {
      const my = data?.find((l: any) => l.user_id === user.id);
      setMyLike(my?.type || null);
    }
  };
  useEffect(() => {
    if (user) fetchLikes();
  }, [id, user]);

  // 댓글 작성
  const handleComment = async () => {
    setError("");
    if (!comment) {
      setError("댓글을 입력하세요.");
      return;
    }
    await supabase.from("comments").insert({
      post_id: id,
      user_id: user.id,
      content: comment,
    });
    setComment("");
    fetchComments();
  };

  // 댓글 삭제
  const handleDeleteComment = async (cid: string) => {
    await supabase.from("comments").delete().eq("id", cid);
    fetchComments();
  };

  // 좋아요/싫어요 토글
  const handleLike = async (type: "like" | "dislike") => {
    if (!user) return;
    // 이미 같은 타입이면 취소, 아니면 변경
    if (myLike === type) {
      await supabase.from("likes").delete().eq("post_id", id).eq("user_id", user.id);
    } else if (myLike) {
      await supabase.from("likes").update({ type }).eq("post_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ post_id: id, user_id: user.id, type });
    }
    fetchLikes();
  };

  // 게시글 수정
  const handleEdit = async () => {
    if (!editTitle || !editContent) {
      setError("제목과 내용을 입력하세요.");
      return;
    }
    await supabase.from("posts").update({
      title: editTitle,
      content: editContent,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setEditMode(false);
    // 수정 후 다시 불러오기
    supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setPost(data));
  };

  // 대댓글 작성
  const handleReply = async (parentId: string) => {
    setError("");
    if (!replyContent) {
      setError("답글을 입력하세요.");
      return;
    }
    await supabase.from("comments").insert({
      post_id: id,
      user_id: user.id,
      content: replyContent,
      parent_id: parentId,
    });
    setReplyContent("");
    setReplyTo(null);
    fetchComments();
  };

  // 트리형 댓글 구조로 변환
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
  const commentTree = buildCommentTree(comments);

  if (!post) return <div className="max-w-xl mx-auto mt-10">로딩 중...</div>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      <button onClick={() => router.back()} className="mb-4 text-blue-500">← 목록으로</button>
      <div className="p-4 border rounded bg-white mb-6">
        {editMode ? (
          <>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
              rows={6}
            />
            <div className="flex gap-2">
              <button onClick={handleEdit} className="px-4 py-2 bg-blue-500 text-white rounded">저장</button>
              <button onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-200 rounded">취소</button>
            </div>
            {error && <div className="mt-2 text-red-500">{error}</div>}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-2">{post.title}</h2>
            <div className="text-xs text-gray-500 mb-1">{post.profiles?.username || "익명"}</div>
            <div className="text-gray-700 whitespace-pre-line mb-2">{post.content}</div>
            <div className="text-xs text-gray-400 mb-2">{new Date(post.created_at).toLocaleString()}</div>
            {user && user.id === post.user_id && (
              <button onClick={() => setEditMode(true)} className="text-xs text-blue-500">수정</button>
            )}
          </>
        )}
        <div className="flex items-center gap-4 mt-2">
          <button
            className={`px-2 py-1 rounded ${myLike === "like" ? "bg-blue-100" : "bg-gray-100"}`}
            onClick={() => handleLike("like")}
            disabled={!user}
          >👍 {likeCount}</button>
          <button
            className={`px-2 py-1 rounded ${myLike === "dislike" ? "bg-red-100" : "bg-gray-100"}`}
            onClick={() => handleLike("dislike")}
            disabled={!user}
          >👎 {dislikeCount}</button>
        </div>
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">댓글</h3>
        {user && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 p-2 border rounded"
              placeholder="댓글을 입력하세요"
            />
            <button onClick={handleComment} className="px-4 bg-blue-500 text-white rounded">등록</button>
          </div>
        )}
        {error && <div className="mb-2 text-red-500">{error}</div>}
        <div className="space-y-2">
          {commentTree.map(c => (
            <CommentNode key={c.id} comment={c} depth={0} />
          ))}
        </div>
      </div>
    </div>
  );
}

// 댓글 트리 노드 컴포넌트
function CommentNode({ comment, depth }: { comment: Comment & { children?: Comment[] }; depth: number }) {
  const [showReply, setShowReply] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("sb-user") || "null") : null;

  const handleReplySubmit = async () => {
    if (!replyValue) return;
    await supabase.from("comments").insert({
      post_id: comment.post_id,
      user_id: user.id,
      content: replyValue,
      parent_id: comment.id,
    });
    setReplyValue("");
    setShowReply(false);
    window.location.reload(); // 간단하게 새로고침
  };

  return (
    <div style={{ marginLeft: depth * 24 }} className="p-2 border rounded bg-gray-50 flex flex-col mb-2">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-gray-800">{comment.content}</div>
          <div className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</div>
          <div className="text-xs text-gray-500">{comment.profiles?.username || "익명"}</div>
        </div>
        {user && user.id === comment.user_id && (
          <button onClick={async () => { await supabase.from("comments").delete().eq("id", comment.id); window.location.reload(); }} className="text-xs text-red-500">삭제</button>
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
          <button onClick={handleReplySubmit} className="px-2 bg-blue-500 text-white rounded">등록</button>
        </div>
      )}
      {comment.children && comment.children.map(child => (
        <CommentNode key={child.id} comment={child} depth={depth + 1} />
      ))}
    </div>
  );
} 