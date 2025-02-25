<?php
/**
 * @author: eanjorin
 * @date: 4/19/15
 */

namespace BuildNigeria\Services;


use BuildNigeria\Category;
use BuildNigeria\Idea;
use BuildNigeria\Issue;
use BuildNigeria\Solution;
use BuildNigeria\Traits\ErrorTrait;
use BuildNigeria\User;
use BuildNigeria\Vote;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class IdeaService
{

    use ErrorTrait;

    protected $securityService;
    private $solution;
    private $issue;
    private $category;
    private $vote;
    const PAGE_SIZE = 15;

    public function __construct(Issue $issue, Category $category, Solution $solution, Vote $vote,
                                SecurityService $securityService)
    {
        $this->securityService = $securityService;
        $this->solution = $solution;
        $this->issue = $issue;
        $this->category = $category;
        $this->vote = $vote;
    }


    /**
     * Create or update solution
     * @param $data
     * @return bool|Solution
     */
    public function createSolution($data)
    {
        $validator = Validator::make($data, [
            'user_id' => 'required|exists:users,id',
            'issue_id' => 'required|exists:issues,id',
            'detail' => 'required'
        ]);

        if ($validator->passes()) {
            //solution exist, update
            if (array_key_exists('id', $data)) {
                $this->solution = $this->solution->findOrFail($data['id']);
            } else {
                $this->solution->user_id = $data['user_id'];
                $this->solution->issue_id = $data['issue_id'];
            }
            $this->saveSolution($data);
            return $this->solution->load('user');
        } else {
            $this->clearErrors()->addError($validator->messages()->all());
            return false;
        }

    }

    /**
     * Creates or updates an issue
     * @param $data
     * @return bool|Issue
     */
    public function createIssue($data)
    {

        $validator = Validator::make($data, ['user_id' => 'required|exists:users,id']);
        $validator->sometimes('detail', 'required|min:150', function ($input) {
            if ($input->status === Issue::DRAFT) {
                return false;
            }
            return true;
        });
        if ($validator->passes()) {
            //issue already exist, retrieve issue and update
            if (array_key_exists('id', $data)) {
                $this->issue = $this->issue->findOrFail($data['id']);
            }
            $this->saveIssue($data);
            $this->updateIssueCategory($data);
            //update user solution if exist, or add new solution
            if (array_key_exists('solution', $data) && array_key_exists('id', $data['solution'])) {
                $this->solution = $this->solution->findOrFail($data['solution']['id']);
                $solution = $this->saveSolution($data['solution']);
            } else {
                $solution = $this->addSolutionToIssue($data);
            }
            //add user specific to solution to issue
            if ($solution) {
                $this->issue->solution = $solution;
            }
            $this->issue->load('categories');
            return $this->issue;
        } else {
            $this->clearErrors()->addError($validator->messages()->all());
            return false;
        }
    }

    public function categories()
    {
        return $this->category->leftJoin('issues_categories as ic', 'categories.id', '=', 'ic.category_id')
            ->leftJoin('issues', 'ic.issue_id', '=', 'issues.id')
            ->select(DB::raw('sum(if(issues.status =' . Issue::PUBLISH . ',1,0)) as issue_count'), 'categories.id', 'category')
            ->orderBy('issue_count', 'desc')
            ->orderBy('category', 'asc')
            ->groupBy('id', 'category')
            ->get();
    }

    /**
     * Gets a particular issue, and all its solutions
     * @param $issue_id
     * @return \Illuminate\Database\Eloquent\Model|null|static
     */
    public function getIssue($issue_id)
    {
        return $this->issuesQuery($issue_id)->first();
    }

    /**
     * Query issue(s) with user, solutions and categories
     * @param int $issueId
     * @param null $status publish|draft
     * @return \Illuminate\Database\Eloquent\Builder|static
     */
    private function issuesQuery($issueId = 0, $status = null)
    {
        $query = $this->issue->with(
            [
                'user', 'solutions' => function ($query) use ($status) {
                $query->with(
                    [
                        'votes' => function ($q) {
                            $q->where('item_type', Vote::ITEM_TYPE_SOLUTION);
                        }, 'user'
                    ])->orderBy('up_vote', 'desc');
                //@todo this probably needs a refactor
                if ($status == Issue::PUBLISH) {
                    $query->where('status', Solution::PUBLISH);
                }
            },
                'categories']);
        if ($status != null) {
            $query->where('status', $status);
        }

        if ($issueId > 0) {
            $query->where('id', $issueId);
        }
        return $query;
    }

    /**
     * Gets a particular solution, with its related user and issue
     * @param $solution_id
     * @return \Illuminate\Database\Eloquent\Model|null|static
     */
    public function getSolution($solution_id)
    {
        return $this->solutionsQuery($solution_id)->first();
    }

    public function solutionsQuery($solution_id = 0, $status = null)
    {
        $query = $this->solution->with(['user', 'issue', 'votes']);
        if ($status != null) {
            $query->where('status', $status);
        }
        if ($solution_id > 0) {
            $query->where('id', $solution_id);
        }

        return $query;
    }

    /**
     * @param $data
     */
    private function updateIssueCategory($data)
    {
        $this->issue->categories()->detach();
        //associate category
        if (array_key_exists('categories', $data) && is_array($data['categories']) && count($data['categories']) > 0) {
            $categories = [];
            foreach ($data['categories'] as $category) {
                $categoryModel = $this->category->where('category', $category)->first();
                if ($categoryModel) {
                    $categories[] = $categoryModel->id;
                } else if (is_string($category)) {
                    $categories[] = $this->category->create(['category' => $category])->id;
                }
            }
            if (count($categories) > 0) {
                $this->issue->categories()->attach($categories);
            }

        }
    }

    private function saveSolution($data)
    {
        if ($this->solution->issue_id && $this->solution->user_id) {
            $this->solution->detail = $data['detail'];
            $this->solution->status = (array_key_exists('status', $data) &&
                $data['status'] == Solution::DRAFT) ? Solution::DRAFT : Solution::PUBLISH;
            $this->solution->save();
            return $this->solution;
        }
    }


    private function addSolutionToIssue($data)
    {
        if (array_key_exists('solution', $data) && array_key_exists('detail', $data['solution'])) {
            //create new solution
            $this->solution->issue_id = $this->issue->id;
            $this->solution->user_id = $this->issue->user_id;
            return $this->saveSolution($data['solution']);
        }
    }


    /**
     * @param $data
     */
    private function saveIssue($data)
    {
        $this->issue->user_id = $data['user_id'];
        $this->issue->detail = $data['detail'];
        $this->issue->status = (array_key_exists('status', $data) &&
            $data['status'] == Issue::DRAFT) ? Issue::DRAFT : Issue::PUBLISH;
        $this->issue->save();
    }

    public function searchIssues($term)
    {
        return $this->issuesQuery(0, Issue::PUBLISH)->whereRaw("match(detail) against (?)", [$term])
            ->orderBy('views', 'desc')
            ->paginate(15);
    }

    public function searchSolutions($term)
    {
        return $this->issue->whereRaw("match(detail) against (?)", [$term])->get();
    }


    public function issues($category = null)
    {
        $query = $this->issuesQuery(0, Issue::PUBLISH);
        if ($category != null) {
            $query->whereExists(function ($q) use ($category) {
                $q->select(DB::raw(1))
                    ->from('issues_categories')
                    ->join('categories', 'issues_categories.category_id', '=',
                        'categories.id')
                    ->where('categories.category', $category)
                    ->whereRaw('issues_categories.issue_id = issues.id');
            });
        }
        return $query->orderBy('updated_at', 'desc')->paginate(self::PAGE_SIZE);

        // maybe order by total number of solution upvotes
    }

    public function vote($userId, $itemId, $itemType, $voteType)
    {

        $validator = Validator::make(
            [
                'user_id' => $userId,
                'item_id' => $itemId,
                'item_type' => $itemType,
                'vote_type' => $voteType
            ],
            [
                'user_id' => 'required|exists:users,id',
                'item_type' => sprintf('required|in:%s,%s', Vote::ITEM_TYPE_ISSUE, Vote::ITEM_TYPE_SOLUTION),
                'vote_type' => sprintf('required|in:%s,%s', Vote::VOTE_TYPE_DOWN, Vote::VOTE_TYPE_UP),
                'item_id' => sprintf('required|exists:%s,id', ($itemType == 'issue' ? 'issues' : 'solutions'))
            ]
        );

        if ($validator->passes()) {
            //try to get existing user vote
            $vote = $this->vote->where('item_id', $itemId)
                ->where('user_id', $userId)
                ->where('item_type', $itemType)
                ->first();

            if ($vote && $vote->vote_type == $voteType) {
                //if user already voted this type, just remove vote
                $vote->delete();
            } else {
                //if user already voted another type, remove vote
                //and add new vote
                if ($vote) $vote->delete();
                $this->vote->create([
                    'item_id' => $itemId,
                    'user_id' => $userId,
                    'item_type' => $itemType,
                    'vote_type' => $voteType
                ]);
            }
            return true;
        } else {
            $this->clearErrors()->addError($validator->messages()->all());
            return false;
        }

    }

    public function deleteSolution(User $user, $solutionId)
    {
        $solution = $this->solution->findOrFail($solutionId);
        if ($solution->user_id == $user->id) {
            $solution->delete();
            return true;
        }
        return false;

    }

    public function deleteIssue(User $user, $issueId)
    {
        $issue = $this->issue->findOrFail($issueId);
        if ($issue->user_id == $user->id) {
            $issue->delete();
            return true;
        }

        return false;

    }

}