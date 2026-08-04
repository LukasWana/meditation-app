import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Heading } from '@components/ui/Heading';

describe('Heading', () => {
  it('renderuje h1 s tridou heading-1 pro level 1', () => {
    render(<Heading level={1}>Meditace</Heading>);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toHaveClass('heading-1');
  });

  it('renderuje spravny tag podle levelu', () => {
    render(<Heading level={3}>Podnadpis</Heading>);
    expect(screen.getByRole('heading', { level: 3 }).tagName).toBe('H3');
  });

  it('umoznuje vizualni styl odlisny od semantickeho levelu', () => {
    render(<Heading level={2} visual="display">Velky</Heading>);
    const el = screen.getByRole('heading', { level: 2 });
    expect(el.tagName).toBe('H2');
    expect(el).toHaveClass('text-display');
  });

  it('pripoji vlastni className, aniz by zahodil zakladni tridu', () => {
    render(<Heading level={1} className="text-center">X</Heading>);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toHaveClass('heading-1');
    expect(el).toHaveClass('text-center');
  });
});