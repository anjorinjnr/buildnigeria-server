define(function () {

    var AuthService = function (API_PATH) {
        this.API_PATH = API_PATH;

    };

    AuthService.prototype.loginWithFacebook = function () {
        var url = this.API_PATH + 'auth/login-with-facebook';
        window.open(url, '', 'width=400, height=300');
    };
    
    AuthService.$inject = ['API_PATH'];
    return AuthService;
});