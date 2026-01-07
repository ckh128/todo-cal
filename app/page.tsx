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
  const [title1, setTitle1] = useState('독서 기록');
  const [title2, setTitle2] = useState('개발 기록');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reading, setReading] = useState('');
  const [dev, setDev] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // 친구 기능 상태
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myShareCode, setMyShareCode] = useState('');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const loadPageData = async (targetId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const uid = targetId || user.id;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (profile) {
      setBackgroundImage(profile.bg_url || '');
      setTitle1(profile.title_1 || '독서 기록');
      setTitle2(profile.title_2 || '개발 기록');
      if (!targetId) setMyShareCode(profile.share_code);
    }

    const { data: todoData } = await supabase.from('todos').select('*').eq('user_id', uid).eq('due_date', selectedDate).order('created_at');
    setTodos(todoData || []);

    const { data: note } = await supabase.from('daily_notes').select('*').eq('user_id', uid).eq('date', selectedDate).maybeSingle();
    setReading(note?.reading || '');
    setDev(note?.dev || '');

    if (!targetId) {
      const { data: fRelations } = await supabase.from('friendships').select('friend_id').eq('user_id', user.id);
      if (fRelations) {
        const fIds = fRelations.map(r => r.friend_id);
        const { data: fProfiles } = await supabase.from('profiles').select('id, nickname, bg_url, share_code').in('id', fIds);
        setFriends(fProfiles || []);
      }
    }
  };

  const handleAddFriend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: target } = await supabase.from('profiles').select('id').eq('share_code', friendCodeInput).single();
    if (!target) return alert("코드 오류!");
    await supabase.from('friendships').upsert({ user_id: user?.id, friend_id: target.id });
    setShowAddFriendModal(false);
    loadPageData();
  };

  useEffect(() => { if (isLoggedIn) loadPageData(viewingUserId || undefined); }, [selectedDate, viewingUserId, isLoggedIn]);

  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const startDay = new Date(year, month, 1).getDay();

  return (
    <div className="min-h-screen p-8 bg-cover bg-center transition-all duration-500 flex items-center justify-center"
      style={{ backgroundImage: `url(${backgroundImage})`, backgroundColor: '#e5e7eb', backgroundAttachment: 'fixed' }}>
      
      {!isLoggedIn ? (
        <div className="max-w-md w-full bg-white/30 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/40">
          <h1 className="text-3xl font-black text-center mb-8">{isSignUp ? 'Sign Up' : 'Login'}</h1>
          <input className="w-full p-4 rounded-2xl mb-4 bg-white/60" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="w-full p-4 rounded-2xl mb-6 bg-white/60" type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold" onClick={isSignUp ? async () => { await supabase.auth.signUp({ email, password }); alert("완료!"); } : async () => { await supabase.auth.signInWithPassword({ email, password }); setIsLoggedIn(true); loadPageData(); }}>
            {isSignUp ? '회원가입' : '시작하기'}
          </button>
          <p className="text-center mt-4 text-xs font-bold cursor-pointer" onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? '로그인' : '계정생성'}</p>
        </div>
      ) : (
        <div className="max-w-7xl w-full relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 메인 콘텐츠 (기록/캘린더/투두) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl border border-white/30">
                <h2 className="font-black mb-4">{title1}</h2>
                <textarea className="w-full h-32 p-3 rounded-2xl bg-white/40 outline-none text-sm" value={reading} readOnly />
              </div>
              <div className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl border border-white/30">
                <h2 className="font-black mb-4">{title2}</h2>
                <textarea className="w-full h-32 p-3 rounded-2xl bg-white/40 outline-none text-sm" value={dev} readOnly />
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/20 backdrop-blur-xl p-8 rounded-3xl border border-white/40 shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <button onClick={() => setMonth(m => m-1)}>◀</button>
                <h2 className="font-black text-2xl">{year}. {month + 1}</h2>
                <button onClick={() => setMonth(m => m+1)}>▶</button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array(startDay).fill(null).map((_, i) => <div key={i} />)}
                {days.map(d => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  return <div key={d} onClick={() => setSelectedDate(dateStr)} className={`aspect-square flex items-center justify-center rounded-2xl cursor-pointer text-sm font-bold ${selectedDate === dateStr ? 'bg-gray-800 text-white shadow-lg' : 'hover:bg-white/40'}`}>{d}</div>
                })}
              </div>
            </div>

            <div className="lg:col-span-4 bg-white/20 backdrop-blur-lg p-6 rounded-3xl border border-white/30 shadow-xl">
              <h2 className="font-black mb-6 text-xl">Today's Tasks</h2>
              <ul className="space-y-3">
                {todos.map(t => <li key={t.id} className="p-4 bg-white/30 rounded-2xl font-bold">{t.title}</li>)}
              </ul>
            </div>
          </div>

          {/* 📍 [여기가 핵심] 우하단 고정 바 (테마 + 친구) */}
          <div className="fixed bottom-10 right-10 flex items-center gap-4 bg-white/40 backdrop-blur-3xl p-4 rounded-[30px] shadow-2xl border border-white/50 z-[9999]">
            <div className="flex items-center gap-2 pr-4 border-r border-white/30">
              <button onClick={() => setViewingUserId(null)} className={`w-10 h-10 rounded-full font-black text-[10px] ${!viewingUserId ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>ME</button>
              {friends.map(f => (
                <button key={f.id} onClick={() => setViewingUserId(f.id)} className={`w-10 h-10 rounded-full border-2 text-[10px] font-bold ${viewingUserId === f.id ? 'border-blue-500' : 'border-white'}`}>FRI</button>
              ))}
              <button onClick={() => setShowAddFriendModal(true)} className="w-10 h-10 rounded-full bg-blue-500 text-white font-black text-xl">+</button>
            </div>
            
            <input className="bg-white/50 rounded-full px-4 py-2 text-[10px] outline-none w-32 focus:w-48 transition-all" placeholder="배경 URL..." onKeyDown={async (e) => {
              if(e.key === 'Enter') {
                const url = e.currentTarget.value;
                setBackgroundImage(url);
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('profiles').upsert({ id: user?.id, bg_url: url });
                e.currentTarget.value = '';
              }
            }} />
            <button onClick={() => { supabase.auth.signOut(); location.reload(); }} className="text-[10px] font-black text-red-500">OUT</button>
          </div>

          {/* 친구 추가 모달 */}
          {showAddFriendModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000]">
              <div className="bg-white p-8 rounded-[40px] w-80 text-center shadow-2xl">
                <h3 className="text-xl font-black mb-2">친구 추가</h3>
                <p className="text-xs text-gray-400 mb-6">코드: <span className="text-blue-600 font-bold">{myShareCode}</span></p>
                <input className="w-full p-4 rounded-2xl bg-gray-100 mb-6 outline-none font-bold" placeholder="친구 코드 입력" onChange={e => setFriendCodeInput(e.target.value)} />
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-bold" onClick={handleAddFriend}>추가</button>
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