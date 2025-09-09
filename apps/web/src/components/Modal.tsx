import styled from "styled-components";
import { ReactNode } from "react";

const Backdrop = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
`;

const Card = styled.div`
  width: 440px; max-width: calc(100vw - 32px);
  background: var(--bg, #fff);
  color: var(--fg, #222);
  border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.18);
`;

const Header = styled.div`
  padding: 16px 20px; font-weight: 700; border-bottom: 1px solid #eee;
`;

const Body = styled.div`
  padding: 16px 20px;
`;

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <Backdrop onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        {title && <Header>{title}</Header>}
        <Body>{children}</Body>
      </Card>
    </Backdrop>
  );
}