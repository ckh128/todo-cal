'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** [타입 정의] */
type Todo = { id: string; title: string; due_date: string; is_done: boolean; };
type Friend = { id: string; nickname: string; bg_url: string; share_code: string; };

export default function Home() {
  // 1. 기본 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // 2. 화면 데이터 상태
  const [backgroundImage, setBackgroundImage] = useState('');
  const [title1, setTitle1] = useState('독서 기록');
  const [title2, setTitle2] = useState('개발 기록');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reading, setReading] = useState('');
  const [dev, setDev] = useState('');
  
  // 3. 날짜 상태
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // 4. ⭐ 친구 공유 관련 상태
  const [viewingUserId, setViewingUserId] = useState<string | null>(null); // 누구 화면을 보는지 (null = 나)
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myShareCode, setMyShareCode] = useState('');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  /** [데이터 로딩 함수] */
  const loadPageData = async (targetId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const uid = targetId || user.id; // 친구 ID가 들어오면 친구꺼, 아니면 내꺼 로드

    // 프로필 정보 (배경, 제목, 내 공유코드) 로드
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (profile) {
      setBackgroundImage(profile.bg_url || '');
      setTitle1(profile.title_1 || '독서 기록');
      setTitle2(profile.title_2 || '개발 기록');
      if (!targetId) setMyShareCode(profile.share_code);
    }

    // 투두 로드
    const { data: todoData } = await supabase.from('todos').select('*').eq('user_id', uid).eq('due_date', selectedDate).order('created_at');
    setTodos(todoData || []);

    // 노트 로드
    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', uid).eq('date', selectedDate).maybeSingle();
    setReading(note?.reading || '');
    setDev(note?.dev || '');

    // 내 친구 목록 로드 (내가 로그인했을 때만)
    if (!targetId) {
      const { data: fRelations } = await supabase.from('friendships').select('friend_id').eq('user_id', user.id);
      if (fRelations) {
        const fIds = fRelations.map(r => r.friend_id);
        const { data: fProfiles } = await supabase.from('profiles').select('id, nickname, bg_url, share_code').in('id', fIds);
        setFriends(fProfiles || []);
      }
    }
  };

  /** [친구 추가 함수] */
  const handleAddFriend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !friendCodeInput) return;

    // 코드로 유저 찾기
    const { data: target } = await supabase.from('profiles').select('id').eq('share_code', friendCodeInput).single();
    if (!target) return alert("유효하지 않은 코드입니다.");
    if (target.id === user.id) return alert("자신은 친구로 추가할 수 없습니다.");

    // 친구 관계 저장
    const { error } = await supabase.from('friendships').upsert({ user_id: user.id, friend_id: target.id });
    if (error) alert("추가 실패: " + error.message);
    else {
      alert("친구 추가 완료!");
      setFriendCodeInput('');
      setShowAddFriendModal(false);
      loadPageData();
    }
  };

  /** [인증 관련] */
  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else { setIsLoggedIn(true); loadPageData(); }
  };

  useEffect(() => { if (isLoggedIn) loadPageData(viewingUserId || undefined); }, [selectedDate, viewingUserId, isLoggedIn]);

  // 캘린더 날짜 계산
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const startDay = new Date(year, month, 1).getDay();

  return (
    <div className="min-h-screen p-8 bg-cover bg-center transition-all duration-500 flex items-center justify-center"
      style={{ backgroundImage: `url(${backgroundImage})`, backgroundColor: '#e5e7eb', backgroundAttachment: 'fixed' }}>
      
      {!isLoggedIn ? (
        /* --- 로그인/회원가입 창 --- */
        <div className="max-w-md w-full bg-white/30 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
          <h1 className="text-3xl font-black text-center mb-8 text-gray-800">{isSignUp ? 'Sign Up' : 'Login'}</h1>
          <input className="w-full p-4 rounded-2xl mb-4 bg-white/60 outline-none" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full p-4 rounded-2xl mb-6 bg-white/60 outline-none" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold mb-4" onClick={isSignUp ? async () => { await supabase.auth.signUp({ email, password }); alert("가입 확인!"); } : handleSignIn}>
            {isSignUp ? '회원가입' : '로그인'}
          </button>
          <p className="text-center text-sm font-bold cursor-pointer" onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? '이미 계정이 있나요?' : '처음이신가요?'}</p>
        </div>
      ) : (
        /* --- 메인 화면 --- */
        <div className="max-w-7xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 좌측: 기록 */}
            <div className="lg:col-span-3 space-y-6">
              {[ { t: title1, c: reading, f: 'title_1' }, { t: title2, c: dev, f: 'title_2' } ].map((sec, i) => (
                <div key={i} className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
                  <h2 className="font-black mb-4">{sec.t}</h2>
                  <textarea className="w-full h-32 p-3 rounded-2xl bg-white/40 outline-none text-sm" value={sec.c} readOnly={!!viewingUserId} />
                </div>
              ))}
            </div>

            {/* 중앙: 캘린더 */}
            <div className="lg:col-span-5 bg-white/20 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/40">
              <h2 className="font-black text-2xl mb-8 text-center">{year}. {month + 1}</h2>
              <div className="grid grid-cols-7 gap-2">
                {Array(startDay).fill(null).map((_, i) => <div key={i} />)}
                {days.map(d => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  return <div key={d} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex items-center justify-center rounded-2xl cursor-pointer text-sm font-bold ${selectedDate === dateStr ? 'bg-gray-800 text-white' : 'hover:bg-white/40'}`}>{d}</div>
                })}
              </div>
            </div>

            {/* 우측: 투두 */}
            <div className="lg:col-span-4 bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
              <h2 className="font-black mb-6 text-xl">Today's Tasks</h2>
              <ul className="space-y-3">
                {todos.length > 0 ? todos.map(t => (
                  <li key={t.id} className="p-4 bg-white/30 rounded-2xl font-bold">{t.title}</li>
                )) : <p className="text-gray-500 text-sm">항목이 없습니다.</p>}
              </ul>
            </div>
          </div>

          {/* ⭐ 하단 통합 컨트롤 바 (테마 + 친구) */}
          <div className="fixed bottom-10 right-10 flex items-center gap-4 bg-white/30 backdrop-blur-3xl p-4 rounded-full shadow-2xl border border-white/40 z-[9999]">
            <span className="text-[10px] font-black text-gray-500 ml-2">FRIENDS</span>
            
            {/* 1. 내 버튼 (나로 돌아가기) */}
            <button onClick={() => setViewingUserId(null)} 
              className={`w-10 h-10 rounded-full font-black text-[10px] transition-all ${!viewingUserId ? 'bg-gray-800 text-white ring-4 ring-white' : 'bg-white/50 text-gray-800'}`}>
              ME
            </button>

            {/* 2. 친구 목록 아이콘 */}
            {friends.map(f => (
              <button key={f.id} onClick={() => setViewingUserId(f.id)} 
                className={`w-10 h-10 rounded-full border-2 transition-all overflow-hidden ${viewingUserId === f.id ? 'border-blue-500 scale-110' : 'border-white/50'}`}>
                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-[8px] font-bold">
                  {f.nickname || 'F'}
                </div>
              </button>
            ))}

            {/* 3. 친구 추가 버튼 (+) */}
            <button onClick={() => setShowAddFriendModal(true)} 
              className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center font-black text-xl hover:bg-white transition shadow-sm">
              +
            </button>

            <div className="w-[1px] h-8 bg-white/30 mx-2" />

            {/* 4. 테마/배경 URL 입력 */}
            <input className="bg-white/40 rounded-full px-4 py-1 text-[10px] outline-none w-32 focus:w-48 transition-all" 
              placeholder="IMG URL..." 
              onKeyDown={async (e) => {
                if(e.key === 'Enter') {
                  const url = e.currentTarget.value;
                  setBackgroundImage(url);
                  const { data: { user } } = await supabase.auth.getUser();
                  await supabase.from('profiles').upsert({ id: user?.id, bg_url: url });
                  e.currentTarget.value = '';
                }
              }} 
            />
            
            <button onClick={() => { supabase.auth.signOut(); location.reload(); }} className="text-[10px] font-black text-red-500 ml-2">LOGOUT</button>
          </div>

          {/* ⭐ 친구 추가 모달 (팝업) */}
          {showAddFriendModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10000]">
              <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center">
                <h3 className="text-2xl font-black mb-4">Add Friend</h3>
                <p className="text-sm text-gray-500 mb-6">내 공유 코드: <span className="text-blue-600 font-black">{myShareCode}</span></p>
                <input className="w-full p-4 rounded-2xl bg-gray-100 mb-6 outline-none font-bold text-center" 
                  placeholder="친구의 6자리 코드 입력" 
                  value={friendCodeInput} 
                  onChange={e => setFriendCodeInput(e.target.value)} />
                <div className="flex gap-3">
                  <button className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-bold" onClick={handleAddFriend}>친구 추가</button>
                  <button className="flex-1 bg-gray-200 py-4 rounded-2xl font-bold" onClick={() => setShowAddFriendModal(false)}>취소</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}