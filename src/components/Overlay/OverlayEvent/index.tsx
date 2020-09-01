import React from 'react';
import styled from 'styled-components';

interface StyledProps {
  active?: boolean;
  size?: string;
}
const StyledOverlayEvent = styled.h2<StyledProps>`
  font-size: ${p => {
    switch (p.size) {
      case 'xxl':
        return p.theme.fontSizeXxl;
      case 'xl':
        return p.theme.fontSizeXl;
      case 'large':
        return p.theme.fontSizeL;
      case 'Ll':
        return p.theme.fontSizeLl;
      case 'medium':
        return p.theme.fontSizeM;
      case 'small':
        return p.theme.fontSizeS;
      default: {
        return p.theme.fontSizeXl;
      }
    }
  }};
  background-color: ${p => p.theme.colorPrimary};
  color: white;
  padding: 1rem;
  font-weight: normal;
  line-height: ${p => p.theme.lineHeightHeadline};
  margin: 0px 40px 20px 40px;

  @media screen and (max-width: ${p => p.theme.screens.tablet}) {
    font-size: ${p => p.theme.fontSizeXl};
  }

  b {
    font-weight: bold;
  }

  span {
    color: ${p => p.theme.colorPrimary};
  }
`;

const OverlayEvent: React.FC<{ title: string; size?: any }> = ({
  title,
  size,
}) => {
  return (
    <StyledOverlayEvent
      size={size}
      dangerouslySetInnerHTML={{ __html: `${title}` }}
    />
  );
};

export default OverlayEvent;
