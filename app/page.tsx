'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Todo = { id: string; title: string; due_date: string; is_done: boolean; };
type Friend = { id: string; nickname: string; bg_url: string; share_code: string; };

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [myProfile, setMyProfile] = useState<any>(null);

  // 공유 기능 관련 상태
  const [viewingUserId, setViewingUserId] = useState<string | null>(null); // 현재 보고 있는 유저 ID (null이면 나)
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');

  const [title1, setTitle1] = useState('기록 1');
  const [title2, setTitle2] = useState('기록 2');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reading, setReading] = useState('');
  const [dev, setDev] = useState('');
  
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 데이터 로드 통합 함수
  const loadAllData = async (targetId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const uid = targetId || user.id;

    // 1. 프로필/배경 로드
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (profile) {
      if (!targetId) setMyProfile(profile); // 내 정보 저장
      setBackgroundImage(profile.bg_url || '');
      setTitle1(profile.title_1 || '기록 1');
      setTitle2(profile.title_2 || '기록 2');
    }

    // 2. 투두 로드
    const { data: todoData } = await supabase.from('todos').select('*').eq('user_id', uid).eq('due_date', selectedDate).order('created_at');
    setTodos(todoData || []);

    // 3. 노트 로드
    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', uid).eq('date', selectedDate).maybeSingle();
    setReading(note?.reading || '');
    setDev(note?.dev || '');

    // 4. 친구 목록 로드 (나일 때만 수행)
    if (!targetId) {
      const { data: fData } = await supabase.from('friendships').select('friend_id').eq('user_id', user.id);
      if (fData) {
        const friendIds = fData.map(f => f.friend_id);
        const { data: profiles } = await supabase.from('profiles').select('id, nickname, bg_url, share_code').in('id', friendIds);
        setFriends(profiles || []);
      }
    }
  };

  const addFriend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !friendCodeInput) return;
    
    const { data: target } = await supabase.from('profiles').select('id').eq('share_code', friendCodeInput).single();
    if (!target) return alert("코드를 확인해주세요!");
    if (target.id === user.id) return alert("본인은 친구로 추가할 수 없습니다.");

    await supabase.from('friendships').upsert({ user_id: user.id, friend_id: target.id });
    setFriendCodeInput('');
    setShowAddFriend(false);
    loadAllData();
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else { setIsLoggedIn(true); loadAllData(); }
  };

  useEffect(() => { if (isLoggedIn) loadAllData(viewingUserId || undefined); }, [selectedDate, viewingUserId, isLoggedIn]);

  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const startDay = new Date(year, month, 1).getDay();

  return (
    <div className="min-h-screen p-8 bg-cover bg-center transition-all duration-500 flex items-center justify-center"
      style={{ backgroundImage: `url(${backgroundImage})`, backgroundColor: '#e5e7eb', backgroundAttachment: 'fixed' }}>
      
      {!isLoggedIn ? (
        <div className="max-w-md w-full bg-white/30 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
          <h1 className="text-3xl font-black text-center mb-8 text-gray-800 tracking-tight">{isSignUp ? 'Join' : 'Login'}</h1>
          <input className="w-full p-4 rounded-2xl mb-4 bg-white/60 outline-none" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="w-full p-4 rounded-2xl mb-6 bg-white/60 outline-none" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold hover:bg-black" onClick={isSignUp ? async () => { await supabase.auth.signUp({ email, password }); alert("가입 완료!"); } : handleSignIn}>
            {isSignUp ? '회원가입' : '시작하기'}
          </button>
          <p className="text-center mt-4 text-sm font-bold cursor-pointer" onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? '로그인하러 가기' : '계정 만들기'}</p>
        </div>
      ) : (
        <div className="max-w-7xl w-full relative">
          {/* 공유 중일 때 표시되는 배너 */}
          {viewingUserId && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-6 py-1 rounded-full font-black text-xs shadow-lg animate-bounce">
              Viewing Friend's Calendar 📢
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 왼쪽/중앙/오른쪽 섹션은 동일 (viewingUserId가 있을 때 저장 버튼만 비활성화) */}
            <div className="lg:col-span-3 space-y-6">
              {[ { t: title1, c: reading, s: setReading, f: 'title_1' }, { t: title2, c: dev, s: setDev, f: 'title_2' } ].map((sec, i) => (
                <div key={i} className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
                  <input className="bg-transparent font-black mb-4 outline-none w-full" value={sec.t} onChange={e => i===0?setTitle1(e.target.value):setTitle2(e.target.value)} disabled={!!viewingUserId} />
                  <textarea className="w-full h-32 p-3 rounded-2xl bg-white/40 outline-none text-sm" value={sec.c} onChange={e => sec.s(e.target.value)} disabled={!!viewingUserId} />
                  {!viewingUserId && <button className="w-full mt-3 bg-gray-800 text-white py-2 rounded-xl text-xs font-bold" onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.from('daily_notes').upsert({ user_id: user?.id, date: selectedDate, reading, dev });
                    alert("저장 완료");
                  }}>저장</button>}
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 bg-white/20 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/40">
               <h2 className="font-black text-2xl mb-8 text-center">{year}. {month + 1}</h2>
               <div className="grid grid-cols-7 gap-2">
                 {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[10px] font-black text-gray-400">{d}</div>)}
                 {Array(startDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                 {days.map(d => {
                   const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                   return <div key={d} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex items-center justify-center rounded-2xl cursor-pointer text-sm font-bold ${selectedDate === dateStr ? 'bg-gray-800 text-white' : 'hover:bg-white/40'}`}>{d}</div>
                 })}
               </div>
            </div>

            <div className="lg:col-span-4 bg-white/20 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/30">
              <h2 className="font-black mb-6 text-xl">Tasks</h2>
              {!viewingUserId && <div className="flex gap-2 mb-6">
                <input className="flex-1 p-3 rounded-2xl text-sm bg-white/40 outline-none" placeholder="Add..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <button className="bg-gray-800 text-white px-4 rounded-2xl" onClick={async () => {
                   const { data: { user } } = await supabase.auth.getUser();
                   await supabase.from('todos').insert({ title: newTitle, user_id: user?.id, due_date: selectedDate });
                   setNewTitle(''); loadAllData();
                }}>추가</button>
              </div>}
              <ul className="space-y-3">
                {todos.map(t => (
                  <li key={t.id} className="flex justify-between p-4 bg-white/30 rounded-2xl">
                    <span className={t.is_done ? 'line-through opacity-40' : 'font-bold'}>{t.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 📱 우하단 통합 바 (테마 + 친구목록) */}
          <div className="fixed bottom-10 right-10 flex items-center gap-4 bg-white/20 backdrop-blur-2xl p-4 rounded-full shadow-2xl border border-white/30 z-50">
            {/* 내 아이콘 (나로 돌아가기) */}
            <button onClick={() => setViewingUserId(null)} className={`w-12 h-12 rounded-full border-4 transition-all flex items-center justify-center bg-gray-800 text-white text-[10px] font-bold ${!viewingUserId ? 'border-yellow-400 scale-110' : 'border-transparent'}`}>ME</button>
            
            <div className="h-8 w-[1px] bg-white/30 mx-2" />

            {/* 친구 목록 아이콘들 */}
            <div className="flex gap-2">
              {friends.map(f => (
                <button key={f.id} onClick={() => setViewingUserId(f.id)} 
                  className={`w-10 h-10 rounded-full border-2 transition-all bg-white/50 overflow-hidden ${viewingUserId === f.id ? 'border-yellow-400 scale-125' : 'border-white/60'}`}
                  title={f.nickname || '친구'}>
                  {f.bg_url ? <img src={f.bg_url} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold">FRI</span>}
                </button>
              ))}
              
              {/* 친구 추가 버튼 */}
              <button onClick={() => setShowAddFriend(true)} className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center font-black text-xl hover:bg-white transition">+</button>
            </div>

            <div className="h-8 w-[1px] bg-white/30 mx-2" />

            {/* 기존 테마 바 (간소화) */}
            <input className="bg-white/40 rounded-full px-4 py-1 text-[10px] outline-none w-24" placeholder="IMG URL..." onKeyDown={e => { if(e.key==='Enter') { setBackgroundImage(e.currentTarget.value); e.currentTarget.value=''; }}} />
            <button onClick={() => supabase.auth.signOut().then(() => location.reload())} className="text-[10px] font-black text-red-500 ml-2">OUT</button>
          </div>

          {/* 친구 추가 팝업 */}
          {showAddFriend && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
              <div className="bg-white p-8 rounded-3xl shadow-2xl w-80">
                <h3 className="font-black mb-2">친구 추가</h3>
                <p className="text-[10px] text-gray-400 mb-4">내 코드: <span className="text-blue-500">{myProfile?.share_code}</span></p>
                <input className="w-full border p-3 rounded-xl mb-4" placeholder="친구 코드 6자리 입력" value={friendCodeInput} onChange={e => setFriendCodeInput(e.target.value)} />
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-800 text-white py-2 rounded-xl font-bold" onClick={addFriend}>추가</button>
                  <button className="flex-1 bg-gray-100 py-2 rounded-xl font-bold" onClick={() => setShowAddFriend(false)}>취소</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}