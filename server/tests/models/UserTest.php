<?php
/**
 * @author: eanjorin
 * @date: 4/19/15
 */

//use Faker;
use Laracasts\TestDummy\DbTestCase;
use Laracasts\TestDummy\Factory;

//use Mockery;


class UserTest extends DbTestCase {


    protected $faker;

    public function setUp() {
        @session_start();
        parent::setUp();
        //Factory::$factoriesPath = 'app/tests/factories';
        $this->faker = Faker\Factory::create();
    }

    public function tearDown() {
        Mockery::close();
        parent::tearDown();
    }


    public function test_signup_creates_account() {
        $userData = Factory::build('BuildNigeria\User');
        $user = $this->app->make('BuildNigeria\User');
        $data = $userData->toArray();
        $newUser = $user->signUpOrLogin($data);
        foreach ($data as $key => $val) {
            //echo PHP_EOL. $key . ': ' . $val . ' == ' . $newUser->{$key};
            $this->assertEquals($val, $newUser->{$key});
        }
        $this->assertNotNull($newUser);
    }

    public function test_signup_doesnot_create_account() {
        $createdUser = Factory::create('BuildNigeria\User');
        $user = $this->app->make('BuildNigeria\User');
        $user2 = $user->signUpOrLogin($createdUser->toArray());
        $this->assertEquals($createdUser->id, $user2->id);
    }


}