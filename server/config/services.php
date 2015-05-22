<?php

return [

	/*
	|--------------------------------------------------------------------------
	| Third Party Services
	|--------------------------------------------------------------------------
	|
	| This file is for storing the credentials for third party services such
	| as Stripe, Mailgun, Mandrill, and others. This file provides a sane
	| default location for this type of information, allowing packages
	| to have a conventional place to find your various credentials.
	|
	*/

	'mailgun' => [
		'domain' => '',
		'secret' => '',
	],

	'mandrill' => [
		'secret' => getenv('MANDRILL_SECRET'),
	],

	'ses' => [
		'key' => '',
		'secret' => '',
		'region' => 'us-east-1',
	],

	'stripe' => [
		'model'  => 'BuildNigeria\User',
		'key' => '',
		'secret' => '',
	],

    'facebook' => [
        'client_id' => getenv('FACEBOOK_CLIENT_ID'),
        'client_secret' => getenv('FACEBOOK_CLIENT_SECRET'),
        'redirect' => getenv('FACEBOOK_CALLBACK_URL'),
    ],

];
