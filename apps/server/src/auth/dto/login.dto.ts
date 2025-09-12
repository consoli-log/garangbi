import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: '유효한 이메일 형식이 아닙니다.' }),
  password: z.string().min(1, { message: '비밀번호를 입력해주세요.' }),
});

export type LoginDto = z.infer<typeof LoginSchema>;