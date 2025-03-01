/**
 * Created by davidadamojr on 4/19/15.
 */
define(function () {

    var DRAFT = 0;
    var PUBLISHED = 1;

    /**
     * Controller to manage creating new issue or solution
     * @param user
     * @param issue
     * @param solution
     * @param $state
     * @param ideaService
     * @param $scope
     * @param util
     * @constructor
     */
    var ShareCtrl = function (user, issue, solution, $state, ideaService, $scope, util) {
        this.ideaService = ideaService;
        this.$state = $state;
        this.user = user;
        this.$scope = $scope;
        this.util = util;
        var self = this;
        //extract categories to populate autocomplete tags
        ideaService.categories(function (categories) {
            self.categories = [];
            categories.forEach(function (item) {
                self.categories.push({text: item.category})
            });
            //console.log(self.categories);
        });
        this.issueCategories = [];
        //if a solution is injected, then we're in edit mode
        //so we show the solution by default, but the user can still view the problem
        //description. The problem desc will be readonly if the user didn't author the problem
        if (!_.isEmpty(solution)) {
            this.mode = (solution.status == PUBLISHED) ? 'edit-published-solution' : 'edit-solution';
            //console.log(solution);
            this.showSolution = true;
            //this.solution = solution;
            this.issue = solution.issue;
            this.issue.solution = solution;
            delete solution.issue;
            //console.log(this.issue);
            this.canEditIssue = false;
            if (solution.user_id === this.issue.user_id) {
                //allow user to edit issue, if user created the issue
                this.canEditIssue = true;
            }
        } else {
            //if an issue is injected, then we are in edit mode for the issue
            //so we just populate the issue and tags(categories), and
            //life goes on as usual
            this.issue = _.isEmpty(issue) ? {user_id: this.user.id, detail: ''} : issue;
            this.mode = (this.issue.status == PUBLISHED) ? 'edit-published-issue' : 'edit-issue';
            if (!this.issue.id) {
                this.mode = 'new-issue';
            }
            if (this.issue.categories) {
                this.issue.categories.forEach(function (cat) {
                    self.issueCategories.push({text: cat.category});
                });
            }
            if (this.issue.solutions) {
                this.issue.solution = this.issue.solutions[0];
            }

        }

        this.errors = {};

    };

    /**
     * Provides autocomplete for tags(categories)
     * @param tag
     * @returns {Array}
     */
    ShareCtrl.prototype.suggestTags = function (tag) {
        var filter = [];
        this.categories.forEach(function (item) {
            if (item.text.toLowerCase().indexOf(tag.toLowerCase()) >= 0) {
                filter.push(item);
            }
        });
        return filter;
    };

    /**
     * Save or update issue/solution
     * @param form
     * @param saveAsDraft
     */
    ShareCtrl.prototype.save = function (form, saveAsDraft) {
        var self = this;
        function issueCallback(resp) {
            if (resp.status === 'success') {
                if (saveAsDraft) {
                    //update draft count if new draft is saved
                    if (!self.issue.id) self.user.drafts++;
                    self.issue = resp.data;
                    self.util.toast('Draft saved.');
                } else {
                    //update draft count if user published a draft
                    if (self.issue.id && self.user.drafts > 0) self.user.drafts--;
                    //reset objects
                    self.issue = {user_id: self.user.id, detail: ''};
                    self.errors = {};
                    self.issueCategories = [];
                    self.$state.go('issue-detail', {issueId: self.util.encodeId(resp.data.id)});
                    //self.util.toast('Posted.');


                }
            } else {
                self.util.ngToast.danger({
                    content: 'Unable to complete your action. ' + (resp.errors) ? resp.errors.join('<br>') : ''
                });
            }
        };
        function solutionCallback(resp) {
            if (resp.status === 'success') {
                if (saveAsDraft) {
                    self.util.toast('Draft saved.');
                } else {
                    //update draft count if user published a draft
                    if ( self.user.drafts > 0) self.user.drafts--;
                    //reset
                    self.errors = {};
                    self.issueCategories = [];
                    //self.util.toast('Posted.');
                    self.$state.go('solution-detail', {solutionId: self.util.encodeId(resp.data.id)});
                }
            } else {
                self.util.ngToast.danger({
                    content: 'Unable to complete your action. ' + (resp.errors) ? resp.errors.join('<br>') : ''
                });

            }
        };
        if (self.mode == 'edit-solution') {  //user is editing solution
            this.issue.solution.status = (saveAsDraft) ? DRAFT : PUBLISHED;
            if (saveAsDraft) {
                this.util.toast('Saving...');
            } else {
                this.util.toast('Posting...');
            }
            if (self.canEditIssue) {
                this.issue.categories = _.pluck(this.issueCategories, 'text');
                self.ideaService.saveIssue(self.issue, issueCallback);
            } else {
                self.ideaService.saveSolution(self.issue.solution, solutionCallback);
            }

        } else if (self.mode == 'edit-published-solution') {
            this.util.toast('Posting...');
            self.ideaService.saveSolution(self.issue.solution, solutionCallback);
        } else {
            if (_.isEmpty(this.issue.detail)) {
                this.errors.issueDetail = true;
                return;
            }
            //user is not saving as draft, so validate
            if (!saveAsDraft) {

                if (this.issueCategories.length == 0) {
                    this.errors.missingCategory = true;
                    return;
                }
            }
            //extract selected categories
            this.issue.categories = _.pluck(this.issueCategories, 'text');
            //update draft or publish status
            if (saveAsDraft) {
                this.util.toast('Saving...');
                this.issue.status = DRAFT;
                if (this.issue.solution) {
                    this.issue.solution.status = DRAFT;
                }
            } else {
                this.util.toast('Posting...');
                this.issue.status = PUBLISHED;
                if (this.issue.solution) {
                    this.issue.solution.status = PUBLISHED;
                }

            }
            //save issue
            self.ideaService.saveIssue(self.issue, issueCallback);
        }
    };
    ShareCtrl.$inject = ['user', 'issue', 'solution', '$state', 'ideaService', '$scope', 'util'];
    return ShareCtrl;
});