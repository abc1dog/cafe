-- ==========================================================================
-- 바이브 카페 (Vibe Cafe) Supabase 'dang' 테이블 완전 초기화 및 생성 SQL
-- Supabase 대시보드 -> SQL Editor에 붙여넣고 [Run]을 누르세요.
-- ==========================================================================

-- 1. 기존에 잘못 생성되었거나 구조가 다른 dang 테이블 완전 삭제
DROP TABLE IF EXISTS dang CASCADE;

-- 2. 규격에 맞춘 dang 테이블 새로 생성
CREATE TABLE dang (
    id BIGSERIAL PRIMARY KEY,                              -- 주문 번호 (자동 증가)
    customer_name TEXT NOT NULL,                          -- 손님 이름
    phone TEXT NOT NULL,                                  -- 전화번호
    drink TEXT NOT NULL,                                  -- 음료 이름
    drink_price INTEGER NOT NULL DEFAULT 0,               -- 음료 기본 가격
    size VARCHAR(10) NOT NULL DEFAULT 'M',                -- 사이즈 (S, M, L)
    options TEXT[] DEFAULT '{}',                          -- 추가 옵션 배열
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0), -- 수량
    request TEXT,                                         -- 요청사항
    total_price INTEGER NOT NULL CHECK (total_price >= 0), -- 총 결제 금액
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Seoul', NOW()) -- 주문 접수 일시
);

-- 3. 빠른 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dang_created_at_desc ON dang (created_at DESC);

-- 4. Row Level Security (RLS) 활성화 및 누구나 접근 가능한 정책 설정
ALTER TABLE dang ENABLE ROW LEVEL SECURITY;

-- [정책 1] 주문 등록(INSERT) 허용
CREATE POLICY "누구나 주문 추가 가능"
ON dang FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- [정책 2] 주문 목록 조회(SELECT) 허용
CREATE POLICY "누구나 주문 조회 가능"
ON dang FOR SELECT
TO anon, authenticated
USING (true);

-- [정책 3] 주문 삭제/취소(DELETE) 허용
CREATE POLICY "누구나 주문 삭제 가능"
ON dang FOR DELETE
TO anon, authenticated
USING (true);

-- 5. Supabase API 스키마 캐시 즉시 갱신
NOTIFY pgrst, 'reload schema';
