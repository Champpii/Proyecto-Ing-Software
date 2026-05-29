/**
 * Simulated authentication controller
 */

export const authController = {
  login: (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Por favor, ingrese un usuario y contraseña.' 
      });
    }

    // Standard pre-filled credentials for the demo
    const defaultUser = 'admin@universidad.edu.gt';
    
    // In a real system we would verify password hashes. For this demo, let's accept any login for user convenience,
    // or validate the default pre-filled credentials while being flexible.
    if (username.trim().toLowerCase() === defaultUser) {
      return res.json({
        success: true,
        message: 'Autenticación exitosa',
        user: {
          username: defaultUser,
          name: 'Administrador UV',
          role: 'Admin',
          token: 'jwt_mock_token_admin_2026'
        }
      });
    }

    // Return success anyway to make it easy for any academic demo input, but specify it's a guest
    return res.json({
      success: true,
      message: 'Autenticación exitosa (Modo Invitado)',
      user: {
        username: username,
        name: username.split('@')[0],
        role: 'Invitado',
        token: 'jwt_mock_token_guest_2026'
      }
    });
  }
};
