export const SimpleTest = () => {
  return (
    <div style={{ padding: '50px', fontSize: '24px', fontFamily: 'Arial' }}>
      <h1>¡Hola! La aplicación está funcionando</h1>
      <p>Si ves esto, el routing funciona correctamente.</p>
      <hr />
      <button
        onClick={() => alert('¡El botón funciona!')}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Haz clic aquí
      </button>
    </div>
  );
};
