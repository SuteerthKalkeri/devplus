export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-message">
      {message}
    </div>
  ) : null;
}
