// Supabase 클라이언트 생성 함수 import
import { createClient } from '@supabase/supabase-js';

// Supabase 프로젝트에 연결되는 클라이언트 생성
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,    // 프로젝트 URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 공개 키
);
