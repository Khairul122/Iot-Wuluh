document.addEventListener("DOMContentLoaded", function() {
    const firebaseConfig = {
        apiKey: "AIzaSyDKmLXcBbT7tp4sQVmxEXtpB7Q-3tNfgQg",
        databaseURL: "https://iot-wuluh-default-rtdb.firebaseio.com/",
    };
    
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");
    const successToast = new bootstrap.Toast(document.getElementById("successToast"));
    const errorToast = new bootstrap.Toast(document.getElementById("errorToast"));
    const errorToastMessage = document.getElementById("errorToastMessage");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const rememberMeCheckbox = document.getElementById("rememberMe");
    
    checkRememberedCredentials();
    
    loginForm.addEventListener("submit", function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (username === "" || password === "") {
            showError("Username dan password harus diisi");
            return;
        }
        
        authenticateUser(username, password);
    });
    
    function authenticateUser(username, password) {
        const loginButton = document.getElementById("loginButton");
        const originalButtonText = loginButton.innerHTML;
        
        loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Memproses...';
        loginButton.disabled = true;
        
        database.ref("user").once("value")
            .then(snapshot => {
                let authenticated = false;
                
                snapshot.forEach(childSnapshot => {
                    const userData = childSnapshot.val();
                    
                    if (userData.username === username && userData.password === password) {
                        authenticated = true;
                        return true;
                    }
                });
                
                if (authenticated) {
                    handleSuccessfulLogin(username, password);
                } else {
                    handleFailedLogin("Username atau password salah");
                }
            })
            .catch(error => {
                handleFailedLogin("Terjadi kesalahan: " + error.message);
            })
            .finally(() => {
                loginButton.innerHTML = originalButtonText;
                loginButton.disabled = false;
            });
    }
    
    function handleSuccessfulLogin(username, password) {
        if (rememberMeCheckbox.checked) {
            localStorage.setItem("rememberedUsername", username);
            localStorage.setItem("rememberedPassword", password);
        } else {
            localStorage.removeItem("rememberedUsername");
            localStorage.removeItem("rememberedPassword");
        }
        
        loginError.style.display = "none";
        successToast.show();
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);
    }
    
    function handleFailedLogin(message) {
        errorToastMessage.textContent = message;
        errorToast.show();
        loginError.textContent = message;
        loginError.style.display = "block";
        passwordInput.value = "";
    }
    
    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = "block";
        
        errorToastMessage.textContent = message;
        errorToast.show();
    }
    
    function checkRememberedCredentials() {
        const rememberedUsername = localStorage.getItem("rememberedUsername");
        const rememberedPassword = localStorage.getItem("rememberedPassword");
        
        if (rememberedUsername && rememberedPassword) {
            usernameInput.value = rememberedUsername;
            passwordInput.value = rememberedPassword;
            rememberMeCheckbox.checked = true;
        }
    }
});