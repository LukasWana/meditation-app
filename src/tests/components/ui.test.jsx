import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Section, Card, Button } from '@components/ui';

describe('Card', () => {
  it('renderuje s surface-card tridou', () => {
    const { container } = render(<Card>obsah</Card>);
    expect(container.firstChild).toHaveClass('surface-card');
  });

  it('pripoji vlastni className', () => {
    const { container } = render(<Card className="text-center">obsah</Card>);
    expect(container.firstChild).toHaveClass('surface-card');
    expect(container.firstChild).toHaveClass('text-center');
  });

  it('variant inner pouziva surface-inner', () => {
    const { container } = render(<Card variant="inner">obsah</Card>);
    expect(container.firstChild).toHaveClass('surface-inner');
    expect(container.firstChild).not.toHaveClass('surface-card');
  });
});

describe('Section', () => {
  it('renderuje <section> s max-w-content', () => {
    const { container } = render(<Section>obsah</Section>);
    expect(container.firstChild.tagName).toBe('SECTION');
    expect(container.firstChild).toHaveClass('max-w-content');
  });

  it('pripoji vlastni className', () => {
    const { container } = render(<Section className="py-8">obsah</Section>);
    expect(container.firstChild).toHaveClass('max-w-content');
    expect(container.firstChild).toHaveClass('py-8');
  });
});

describe('Button', () => {
  it('renderuje <button> s interactive tridou', () => {
    render(<Button>Klik</Button>);
    expect(screen.getByRole('button')).toHaveClass('interactive');
  });

  it('pripoji vlastni className', () => {
    render(<Button className="w-full">Klik</Button>);
    const el = screen.getByRole('button');
    expect(el).toHaveClass('interactive');
    expect(el).toHaveClass('w-full');
  });

  it('variant ghost pridava prislusnou tridu', () => {
    render(<Button variant="ghost">Klik</Button>);
    expect(screen.getByRole('button')).toHaveClass('interactive');
  });

  it('respektuje disabled', () => {
    render(<Button disabled>Klik</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});