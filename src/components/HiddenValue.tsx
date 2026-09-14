/**
 * 투표가 끝나기 전 가려 둔 값을 흐리게 보여 준다.
 * 실제 값은 서버에서 지워서 내려오므로 흐리게 보이는 글자는 자리만 채우는 가짜다.
 */
export function HiddenValue({ placeholder }: { placeholder: string }) {
  return (
    <span title="투표가 끝나면 공개돼요">
      <span aria-hidden="true" className="select-none blur-[3px]">
        {placeholder}
      </span>
      <span className="sr-only">투표가 끝나면 공개돼요</span>
    </span>
  );
}
