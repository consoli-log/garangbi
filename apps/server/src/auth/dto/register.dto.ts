import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email({ message: '유효한 이메일 형식이 아닙니다.' }),
  nickname: z
    .string()
    .min(2, { message: '닉네임은 2자 이상이어야 합니다.' })
    .max(10, { message: '닉네임은 10자 이하이어야 합니다.' })
    .regex(/^[a-zA-Z0-9가-힣]+$/, {
      message: '닉네임에는 특수문자를 사용할 수 없습니다.',
    }),
  password: z
    .string()
    .min(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
    .max(16, { message: '비밀번호는 16자 이하이어야 합니다.' })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
      message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    }),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;