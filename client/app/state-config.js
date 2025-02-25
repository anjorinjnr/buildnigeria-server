/**
 * Created by eanjorin on 4/7/15.
 */
define(function () {
    var StateConfig = function ($stateProvider, $urlRouterProvider) {

        var resolves = {
            //return user data, if user is logged in
            loggedInUser: ['userService', '$cookieStore', 'authService', '$q', '$state',
                function (userService, $cookieStore, authService, $q, $state) {

                    var userPromise = $q.defer();
                    //check if session information exist, and query user information
                    var session = authService.getSession();
                    if (session) {
                        userService.get({'user_token': session.user_token}, function (user) {
                            var user = user.toJSON();
                            if (!_.isEmpty(user)) {
                                userPromise.resolve(user);
                                authService.setCurrentUser(user);
                            } else if (!authService.isPublic) {
                                authService.logout();
                            } else {
                                userPromise.resolve(null);
                            }

                        });
                    } else {
                        userPromise.resolve(null);
                    }
                    return userPromise.promise;
                }],
            issue: ['ideaService', 'util', '$stateParams', function (ideaService, util, $stateParams) {
                var id = util.decodeId($stateParams.issueId);
                return ideaService.issue({issue_id: id}).$promise;

            }],
            issues: ['ideaService', '$stateParams', function (ideaService, $stateParams) {
                if ($stateParams.category) {
                    return ideaService.issues({category: $stateParams.category}).$promise;
                } else {
                    return ideaService.issues().$promise;
                }

            }],

            solution: ['ideaService', 'util', '$stateParams', function (ideaService, util, $stateParams) {
                var id = util.decodeId($stateParams.solutionId);
                return ideaService.solution({solution_id: id}).$promise;

            }],
            categories: ['ideaService', function (ideaService) {
                return ideaService.categories().$promise;
            }],
            search : {
                issues: ['ideaService', '$stateParams', function (ideaService, $stateParams) {
                        return ideaService.search({term: $stateParams.term}).$promise;
                }]
            },
            drafts: {
                issues: ['user', 'userService', function (user, userService) {
                    return userService.drafts({user_id: user.id, type: 'issue'}).$promise;
                }],
                solutions: ['user', 'userService', function (user, userService) {
                    return userService.drafts({user_id: user.id, type: 'solution'}).$promise;
                }]
            },
            user: {
                issues: ['user', 'userService', function(user, userService) {
                    return userService.issues({user_id: user.id}).$promise;
                }],
                solutions: ['user', 'userService', function(user, userService) {
                    return userService.solutions({user_id: user.id}).$promise;
                }]
            },
            emptyObject: function () {
                return {};
            }
        };


        $stateProvider
            .state('main', {
                abstract: true,
                templateUrl: 'main/main.html',
                controller: 'MainCtrl as mainCtrl',
                resolve: {
                    user: resolves.loggedInUser
                }
            })

            .state('logout', {
                url: '/logout'
            })

            .state('home', {
                url: '/home',
                controller: 'HomeCtrl as homeCtrl',
                parent: 'main',
                templateUrl: 'home/home.html',
                resolve: {
                    issues: resolves.issues,
                    categories: resolves.categories
                },
                data: {
                    public: false
                }

            })
            .state('issues-by-tag', {
                url: '/tagged/:category',
                controller: 'HomeCtrl as homeCtrl',
                parent: 'main',
                templateUrl: 'home/home.html',
                resolve: {
                    issues: resolves.issues,
                    categories: resolves.categories
                },
                data: {
                    public: false
                }

            })

            .state('solution-detail', {
                url: '/solutions/:solutionId',
                templateUrl: 'solutions/solution.html',
                parent: 'main',
                controller: 'SolutionCtrl as solutionCtrl',
                data: {
                    public: false
                },
                resolve: {
                    solution: resolves.solution,
                    user: resolves.loggedInUser
                }
            })

            .state('issue-detail', {
                url: '/issue/:issueId',
                templateUrl: 'issues/issue.html',
                parent: 'main',
                controller: 'IssueCtrl as issueCtrl',
                data: {
                    public: false
                },
                resolve: {
                    issue: resolves.issue,
                    user: resolves.loggedInUser
                }
            })

            .state('oauth-callback', {
                url: '/oauth',
                controller: ['$location', 'authService', '$rootScope', function ($location, authService, $rootScope) {
                    var token = $location.search().ut;
                    if (token) {
                        if (window.opener != null) {
                            window.opener.authCallback(token.trim());
                            window.close();
                        } else {
                            window.location = window.location.origin + '/#/home';
                        }
                    } else {
                        if (window.opener != null) {
                            //@todo append param for login error
                            window.opener.location = window.location.origin + '/#/login';
                            window.close();
                        } else {
                            window.location = window.location.origin + '/#/login';
                        }
                    }

                }]
            })


            .state('share', {
                url: '/share',
                controller: 'ShareCtrl as shareCtrl',
                templateUrl: 'share/share.html',
                parent: 'main',
                resolve: {
                    user: resolves.loggedInUser,
                    issue: resolves.emptyObject,
                    solution: resolves.emptyObject
                },
                data: {
                    public: false
                }
            })

            .state('drafts', {
                url: '/drafts',
                templateUrl: 'drafts/drafts.html',
                controller: 'DraftsCtrl as draftsCtrl',
                parent: 'main',
                data: {
                    public: false
                },
                resolve: {
                    issues: resolves.drafts.issues,
                    solutions: resolves.drafts.solutions
                }
            })

            .state('issues', {
                url: '/issues',
                templateUrl: 'drafts/drafts-inner.html',
                data: {
                    public: false,
                    type: 'issues'
                },
                parent: 'drafts'

            })
            .state('solutions', {
                url: '/solutions',
                templateUrl: 'drafts/drafts-inner.html',
                data: {
                    public: false,
                    type: 'solutions'
                },
                parent: 'drafts'

            })

            .state('edit-issue', {
                url: '/issues/edit/:issueId',
                controller: 'ShareCtrl as shareCtrl',
                templateUrl: 'share/share.html',
                data: {
                    public: false,
                    edit: true
                },
                parent: 'main',
                resolve: {
                    issue: resolves.issue,
                    solution: resolves.emptyObject,
                    validate: ['user', '$state', 'issue', function (user, $state, issue) {
                        if (issue.user_id != user.id) {
                            $state.go('home');
                        }
                        return true;

                    }]
                }
            })


            .state('edit-solution', {
                url: '/solutions/edit/:solutionId',
                controller: 'ShareCtrl as shareCtrl',
                templateUrl: 'share/share.html',
                data: {
                    public: true,
                    edit: true
                },
                parent: 'main',
                resolve: {
                    issue: resolves.emptyObject,
                    solution: resolves.solution,
                    validate: ['user', '$state', 'solution', function (user, $state, solution) {
                        if (solution.user_id != user.id) {
                            $state.go('home');
                        }
                        return true;

                    }]
                }
            })
            
            .state('profile', {
                url: '/profile',
                templateUrl: 'profile/profile.html',
                controller: 'ProfileCtrl as profileCtrl',
                parent: 'main',
                data: {
                    public: false
                },
                resolve: {
                    user: resolves.loggedInUser,
                    issues: resolves.user.issues,
                    solutions: resolves.user.solutions
                }
            })
            
            .state('profile-issues', {
                url: '/issues',
                templateUrl: 'profile/profile-issues.html',
                parent: 'profile',
                data: {
                    public: false,
                    type: 'issues'
                }
            })
            
            .state('profile-solutions', {
                url: '/solutions',
                templateUrl: 'profile/profile-solutions.html',
                parent: 'profile',
                data: {
                    public: false,
                    type: 'solutions'
                }
            })

            .state('search', {
                url: '/search/:term',
                controller: 'SearchCtrl as searchCtrl',
                templateUrl: 'search/search.html',
                parent: 'main',
                data: {
                    public: false
                },
                resolve: {
                    issues: resolves.search.issues
                }
            })

            .state('login', {
                url: '/',
                templateUrl: 'login/login_two_col.html',
                controller: 'LoginCtrl as loginCtrl',
                data: {
                    public: true
                }
            })
            
            .state('static-template', {
                abstract: true,
                templateUrl: 'static/template.html'
            })
            
            .state('about', {
                url: '/about',
                templateUrl: 'static/about.html',
                controller: function() {
                
                },
                data: {
                    public: true
                },
                parent: 'static-template'
            })
            
            .state('privacy', {
                url: '/privacy',
                templateUrl: 'static/privacy.html',
                controller: function() {
                
                },
                data: {
                    public: true
                },
                parent: 'static-template'
            })
            
            .state('terms', {
                url: '/terms',
                templateUrl: 'static/terms.html',
                controller: function() {
                
                },
                data: {
                    public: true
                },
                parent: 'static-template'
            })

            .state('register', {
                url: '/register',
                templateUrl: 'register/register.html',
                controller: 'RegisterCtrl as registerCtrl',
                data: {
                    public: true
                }
            });

        $urlRouterProvider.otherwise('/');


    };
    StateConfig.$inject = ['$stateProvider', '$urlRouterProvider'];
    return StateConfig;
});