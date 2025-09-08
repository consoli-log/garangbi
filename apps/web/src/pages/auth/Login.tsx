import { useState } from 'react';
import styled from 'styled-components';
import { login as loginApi } from '@services/auth';
import { useAuthStore } from '../../stores/auth';
import { toast } from 'react-toastify';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { z } from 'zod';

const Card = styled.div`
  background:${p=>p.theme.card}; padding:24px; border-radius:14px; max-width:420px; margin:40px auto; box-shadow:0 4px 24px rgba(0,0,0,.08);
`;
const Row = styled.div`display:flex; flex-direction:column; gap:6px; margin-bottom:14px;`;
const Input = styled.input`padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.15); background:transparent; color:inherit;`;
const Button = styled.button`width:100%; padding:10px 12px; border-radius:10px; border:none; background:#5865F2; color:#fff; cursor:pointer; font-weight:600;`;
const Check = styled.label`display:flex; align-items:center; gap:8px; font-size:14px; color:rgba(0,0,0,.7);`;

const schema = z.object({
  email: z.string().email('이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상입니다.')
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const setAuth = useAuthStore(s=>s.login);
  const nav = useNavigate();
  const loc = useLocation() as any;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    try {
      const res = await loginApi(email, password);
      setAuth(res.accessToken, res.user, keep);
      toast.success('로그인 성공');
      const to = loc.state?.from?.pathname ?? '/';
      nav(to, { replace: true });
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 401 || msg === 'Invalid credentials') {
        toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        toast.error(msg ?? '로그인 실패');
      }
    }
  }

  return (
    <Card>
      <h2>로그인</h2>
      <form onSubmit={onSubmit}>
        <Row>
          <label>이메일</label>
          <Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
        </Row>
        <Row>
          <label>비밀번호</label>
          <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="********"/>
        </Row>
        <Row>
          <Check><input type="checkbox" checked={keep} onChange={e=>setKeep(e.target.checked)} /> 로그인 상태 유지</Check>
        </Row>
        <Button type="submit">로그인</Button>
      </form>
      <p style={{marginTop:12,fontSize:14}}>처음이신가요? <Link to="/auth/register">회원가입</Link></p>
    </Card>
  );
}
