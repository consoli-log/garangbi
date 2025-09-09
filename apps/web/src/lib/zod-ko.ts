import { z, ZodErrorMap, ZodIssueCode } from 'zod';

const koErrorMap: ZodErrorMap = (issue, ctx) => {
  const { defaultError } = ctx;

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: '필수 항목입니다.' };
      return { message: '유효하지 않은 값입니다.' };

    case ZodIssueCode.invalid_string:
      switch (issue.validation) {
        case 'email': return { message: '이메일 형식이 아닙니다.' };
        case 'url': return { message: 'URL 형식이 아닙니다.' };
        case 'uuid': return { message: 'UUID 형식이 아닙니다.' };
        case 'regex': return { message: '형식이 올바르지 않습니다.' };
        case 'datetime': return { message: '날짜/시간 형식이 아닙니다.' };
        default: return { message: '문자열 형식이 올바르지 않습니다.' };
      }

    case ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `최소 ${issue.minimum}자 이상이어야 합니다.` };
      if (issue.type === 'array')  return { message: `최소 ${issue.minimum}개 이상이어야 합니다.` };
      if (issue.type === 'number') return { message: `${issue.inclusive ? '최소' : '초과'} ${issue.minimum}${issue.inclusive ? '' : ' 초과'}이어야 합니다.` };
      return { message: '값이 너무 작습니다.' };

    case ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `최대 ${issue.maximum}자 이하이어야 합니다.` };
      if (issue.type === 'array')  return { message: `최대 ${issue.maximum}개 이하이어야 합니다.` };
      if (issue.type === 'number') return { message: `${issue.inclusive ? '최대' : '미만'} ${issue.maximum}${issue.inclusive ? '' : ' 미만'}이어야 합니다.` };
      return { message: '값이 너무 큽니다.' };

    case ZodIssueCode.invalid_enum_value:
      return { message: '허용되지 않는 선택입니다.' };

    case ZodIssueCode.unrecognized_keys:
      return { message: '알 수 없는 필드가 포함되어 있습니다.' };

    case ZodIssueCode.invalid_union:
      return { message: '입력값이 허용되는 형식과 일치하지 않습니다.' };

    case ZodIssueCode.invalid_literal:
      return { message: '허용되지 않는 리터럴 값입니다.' };

    case ZodIssueCode.custom:
      return { message: defaultError };

    default:
      return { message: defaultError };
  }
};

z.setErrorMap(koErrorMap);
