export function Placeholder({ title, iteration }: { title: string; iteration: number }) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-text-2">Esta tela será entregue na iteração {iteration}.</p>
    </div>
  )
}
