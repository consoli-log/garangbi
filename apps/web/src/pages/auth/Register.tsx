import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { register as registerApi, login as loginApi } from '@services/auth';
import { useAuthStore } from '../../stores/auth';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';

const Card = styled.div`
  background:${p=>p.theme.card}; padding:24px; border-radius:14px; max-width:460px; margin:40px auto; box-shadow:0 4px 24px rgba(0,0,0,.08);
`;
const Row = styled.div`display:flex; flex-direction:column; gap:6px; margin-bottom:14px;`;
const Input = styled.input`padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.15); background:transparent; color:inherit;`;
const Button = styled.button`width:100%; padding:10px 12px; border-radius:10px; border:none; background:#10b981; color:#fff; cursor:pointer; font-weight:600;`;
const Meter = styled.div<{level:number}>`
  height:8px; border-radius:6px; background:rgba(0,0,0,.08); overflow:hidden; margin-top:2px;
  &::after{content:""; display:block; height:100%; width:${p=>[ '33%','66%','100%' ][p.level]}; background:${p=>['#ef4444','#f59e0b','#10b981'][p.level]};}
`;

const schema = z.object({
  email: z.string().email('이메일 형식이 아닙니다.'),
  nickname: z.string().regex(/^[A-Za-z0-9가-힣]{2,10}$/, '닉네임은 2~10자, 특수문자 불가'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상입니다.')
    .max(16, '비밀번호는 16자 이하입니다.')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^\w\s]).{8,16}$/, '영문/숫자/특수문자 포함 8~16자')
});

function pwLevel(pw: string) {
  let s = 0;
  if (/[A-Za-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^\w\s]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  return Math.min(2, Math.max(0, s - 1));
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const setAuth = useAuthStore(s=>s.login);
  const nav = useNavigate();

  const level = useMemo(()=>pwLevel(password), [password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, nickname, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    try {
      await registerApi(email, nickname, password);
      const res = await loginApi(email, password);
      setAuth(res.accessToken, res.user, keep);
      toast.success('가입 완료! 환영합니다 👋');
      nav('/', { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      if (msg === '이미 사용 중인 이메일입니다.' || msg === 'Email already exists') {
        toast.error('이미 사용 중인 이메일입니다.');
      } else {
        toast.error(msg ?? '회원가입 실패');
      }
    }
  }

  return (
    <Card>
      <h2>회원가입</h2>
      <form onSubmit={onSubmit}>
        <Row>
          <label>이메일</label>
          <Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
        </Row>
        <Row>
          <label>닉네임</label>
          <Input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="2~10자, 특수문자 불가"/>
        </Row>
        <Row>
          <label>비밀번호</label>
          <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="영문/숫자/특수문자 포함 8~16자"/>
          <Meter level={level} />
        </Row>
        <Row>
          <label style={{fontSize:14}}><input type="checkbox" checked={keep} onChange={e=>setKeep(e.target.checked)} /> 로그인 상태 유지</label>
        </Row>
        <Button type="submit">가입하기</Button>
      </form>
      <p style={{marginTop:12,fontSize:14}}>이미 계정이 있나요? <Link to="/auth/login">로그인</Link></p>
    </Card>
  );
}
