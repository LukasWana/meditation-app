import React from 'react';
import { Heading } from './Heading';

export const Section = ({
  title,
  titleLevel = 2,
  className = '',
  children,
  ...rest
}) => {
  const classes = `max-w-content mx-auto px-4 py-8 ${className}`.trim();

  return (
    <section className={classes} {...rest}>
      {title && <Heading level={titleLevel}>{title}</Heading>}
      {children}
    </section>
  );
};

export default Section;